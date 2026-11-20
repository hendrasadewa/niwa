import { zValidator } from "@hono/zod-validator";
import {
  changePasswordSchema,
  grantAppRoleSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  revokeAppRoleSchema,
  updateUserSchema,
} from "@niwa/auth-validators";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { Hono } from "hono";
import {
  createDb,
  refreshTokens,
  roles,
  userAppRoles,
  users,
} from "../db";
import {
  ensureRbacSeeded,
  getUserAppRolesAndPermissions,
} from "../db/rbac";
import { authMiddleware } from "../middleware/auth";
import { isUserAdmin } from "../middleware/rbac";
import type { AppEnv, AuthUserResponse } from "../types";
import { resolveAccessTokenTtl, signNiwaToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  issueRefreshToken,
  resolveRefreshTokenTtl,
  revokeAllUserRefreshTokens,
  revokeRefreshTokenByRaw,
  rotateRefreshToken,
} from "../utils/refresh-token";

export const authRoutes = new Hono<AppEnv>();

// POST /api/v1/auth/register
authRoutes.post(
  "/register",
  zValidator("json", registerSchema),
  async (c) => {
    const { email, password, name, whatsapp_number, app_id, role } =
      c.req.valid("json");
    const normalizedEmail = email.toLowerCase();
    const normalizedWhatsapp = whatsapp_number ?? "";
    const targetAppId = app_id || "open-po";
    const db = createDb(c.env.DB);

    await ensureRbacSeeded(db);

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return c.json(
        { error: "Conflict", message: "Email is already registered" },
        409
      );
    }

    const [userCountRow] = await db.select({ value: count() }).from(users);
    const isFirstUser = (userCountRow?.value ?? 0) === 0;
    const isConfiguredAdmin =
      Boolean(c.env.ADMIN_EMAIL) &&
      c.env.ADMIN_EMAIL?.toLowerCase() === normalizedEmail;

    const userId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      name,
      whatsapp_number: normalizedWhatsapp,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const roleAssignments: Array<{
      user_id: string;
      app_id: string;
      role_id: string;
    }> = [];

    if (isFirstUser || isConfiguredAdmin) {
      // First user or configured admin receives full roles across seeded apps
      roleAssignments.push(
        { user_id: userId, app_id: "open-po", role_id: "open-po:role-member" },
        { user_id: userId, app_id: "open-po", role_id: "open-po:role-seller" },
        { user_id: userId, app_id: "open-po", role_id: "open-po:role-admin" },
        { user_id: userId, app_id: "pustaka", role_id: "pustaka:role-member" },
        { user_id: userId, app_id: "pustaka", role_id: "pustaka:role-admin" }
      );
    } else {
      const [memberRole] = await db
        .select({ id: roles.id, app_id: roles.app_id })
        .from(roles)
        .where(and(eq(roles.app_id, targetAppId), eq(roles.name, "member")))
        .limit(1);

      if (memberRole) {
        roleAssignments.push({
          user_id: userId,
          app_id: memberRole.app_id,
          role_id: memberRole.id,
        });
      }

      if (role === "seller") {
        const [sellerRole] = await db
          .select({ id: roles.id, app_id: roles.app_id })
          .from(roles)
          .where(and(eq(roles.app_id, targetAppId), eq(roles.name, "seller")))
          .limit(1);

        if (sellerRole) {
          roleAssignments.push({
            user_id: userId,
            app_id: sellerRole.app_id,
            role_id: sellerRole.id,
          });
        }
      }
    }

    if (roleAssignments.length > 0) {
      await db
        .insert(userAppRoles)
        .values(roleAssignments)
        .onConflictDoNothing();
    }

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userId);

    const userResponse: AuthUserResponse = {
      id: userId,
      email: normalizedEmail,
      name,
      whatsapp_number: normalizedWhatsapp,
      is_active: true,
      app_roles,
      app_permissions,
      created_at: now,
      updated_at: now,
    };

    const accessTtl = resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS);
    const refreshTtl = resolveRefreshTokenTtl(c.env.REFRESH_TOKEN_TTL_SECONDS);

    const token = await signNiwaToken(
      userResponse,
      c.env.JWT_SECRET,
      accessTtl
    );
    const issuedRefresh = await issueRefreshToken(db, {
      userId,
      userAgent: c.req.header("User-Agent"),
      ttlSeconds: refreshTtl,
    });

    return c.json(
      {
        user: userResponse,
        token,
        refresh_token: issuedRefresh.rawToken,
        expires_in: accessTtl,
      },
      201
    );
  }
);

// POST /api/v1/auth/login
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const normalizedEmail = email.toLowerCase();
  const db = createDb(c.env.DB);

  await ensureRbacSeeded(db);

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!userRecord || !userRecord.is_active) {
    return c.json(
      { error: "Unauthorized", message: "Invalid email or password" },
      401
    );
  }

  const isPasswordValid = await verifyPassword(
    password,
    userRecord.password_hash
  );
  if (!isPasswordValid) {
    return c.json(
      { error: "Unauthorized", message: "Invalid email or password" },
      401
    );
  }

  const { app_roles, app_permissions } =
    await getUserAppRolesAndPermissions(db, userRecord.id);

  const userResponse: AuthUserResponse = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    whatsapp_number: userRecord.whatsapp_number,
    is_active: userRecord.is_active,
    app_roles,
    app_permissions,
    created_at: userRecord.created_at,
    updated_at: userRecord.updated_at,
  };

  const accessTtl = resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS);
  const refreshTtl = resolveRefreshTokenTtl(c.env.REFRESH_TOKEN_TTL_SECONDS);

  const token = await signNiwaToken(userResponse, c.env.JWT_SECRET, accessTtl);
  const issuedRefresh = await issueRefreshToken(db, {
    userId: userRecord.id,
    userAgent: c.req.header("User-Agent"),
    ttlSeconds: refreshTtl,
  });

  return c.json({
    user: userResponse,
    token,
    refresh_token: issuedRefresh.rawToken,
    expires_in: accessTtl,
  });
});

// POST /api/v1/auth/refresh - Rotate refresh token and issue a fresh access JWT
authRoutes.post(
  "/refresh",
  zValidator("json", refreshTokenSchema),
  async (c) => {
    const { refresh_token } = c.req.valid("json");
    const db = createDb(c.env.DB);
    const accessTtl = resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS);
    const refreshTtl = resolveRefreshTokenTtl(c.env.REFRESH_TOKEN_TTL_SECONDS);

    const rotated = await rotateRefreshToken(db, refresh_token, {
      userAgent: c.req.header("User-Agent"),
      ttlSeconds: refreshTtl,
    });

    if (!rotated.ok) {
      return c.json(
        {
          error: "Unauthorized",
          code: rotated.reason,
          message: rotated.message,
        },
        401
      );
    }

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, rotated.userId))
      .limit(1);

    if (!userRecord || !userRecord.is_active) {
      await revokeAllUserRefreshTokens(db, rotated.userId);
      return c.json(
        { error: "Unauthorized", message: "User account is inactive or missing" },
        401
      );
    }

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userRecord.id);

    const userResponse: AuthUserResponse = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      whatsapp_number: userRecord.whatsapp_number,
      is_active: userRecord.is_active,
      app_roles,
      app_permissions,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    };

    const token = await signNiwaToken(
      userResponse,
      c.env.JWT_SECRET,
      accessTtl
    );

    return c.json({
      user: userResponse,
      token,
      refresh_token: rotated.newRefreshToken,
      expires_in: accessTtl,
    });
  }
);

// POST /api/v1/auth/logout - Revoke the provided refresh token session family
authRoutes.post("/logout", zValidator("json", logoutSchema), async (c) => {
  const { refresh_token } = c.req.valid("json");
  if (refresh_token) {
    const db = createDb(c.env.DB);
    await revokeRefreshTokenByRaw(db, refresh_token);
  }
  return c.json({ message: "Logged out successfully" });
});

// POST /api/v1/auth/logout-all - Revoke all active refresh tokens for the authenticated user
authRoutes.post("/logout-all", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = createDb(c.env.DB);
  const revokedCount = await revokeAllUserRefreshTokens(db, user.id);

  return c.json({
    message: "Logged out from all sessions",
    revoked_sessions: revokedCount,
  });
});

// GET /api/v1/auth/sessions - List active refresh token sessions for the authenticated user
authRoutes.get("/sessions", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = createDb(c.env.DB);
  const now = Math.floor(Date.now() / 1000);

  const activeSessions = await db
    .select({
      id: refreshTokens.id,
      family_id: refreshTokens.family_id,
      user_agent: refreshTokens.user_agent,
      created_at: refreshTokens.created_at,
      expires_at: refreshTokens.expires_at,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.user_id, user.id),
        isNull(refreshTokens.revoked_at),
        gt(refreshTokens.expires_at, now)
      )
    )
    .orderBy(desc(refreshTokens.created_at));

  return c.json({
    sessions: activeSessions,
  });
});

// GET /api/v1/auth/me & alias GET /api/v1/auth/profile
authRoutes.get("/me", authMiddleware, async (c) => {
  const user = c.get("user")!;
  return c.json({ user });
});

authRoutes.get("/profile", authMiddleware, async (c) => {
  const user = c.get("user")!;
  return c.json({ user });
});

// PUT /api/v1/auth/me - Update name & whatsapp_number and return refreshed token + user
authRoutes.put(
  "/me",
  authMiddleware,
  zValidator("json", updateUserSchema),
  async (c) => {
    const currentUser = c.get("user")!;
    const updates = c.req.valid("json");
    const db = createDb(c.env.DB);
    const now = Math.floor(Date.now() / 1000);

    const nextName = updates.name ?? currentUser.name;
    const nextWhatsapp =
      updates.whatsapp_number ?? currentUser.whatsapp_number;

    await db
      .update(users)
      .set({
        name: nextName,
        whatsapp_number: nextWhatsapp,
        updated_at: now,
      })
      .where(eq(users.id, currentUser.id));

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, currentUser.id);

    const updatedUser: AuthUserResponse = {
      ...currentUser,
      name: nextName,
      whatsapp_number: nextWhatsapp,
      app_roles,
      app_permissions,
      updated_at: now,
    };

    const accessTtl = resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS);
    const token = await signNiwaToken(
      updatedUser,
      c.env.JWT_SECRET,
      accessTtl
    );

    return c.json({
      user: updatedUser,
      token,
      expires_in: accessTtl,
    });
  }
);

// PUT /api/v1/auth/password - Change authenticated user's password and rotate sessions
authRoutes.put(
  "/password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const currentUser = c.get("user")!;
    const { current_password, new_password, revoke_other_sessions } =
      c.req.valid("json");
    const db = createDb(c.env.DB);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!userRecord || !userRecord.is_active) {
      return c.json(
        { error: "Unauthorized", message: "User not found or inactive" },
        401
      );
    }

    const isCurrentValid = await verifyPassword(
      current_password,
      userRecord.password_hash
    );
    if (!isCurrentValid) {
      return c.json(
        { error: "Unauthorized", message: "Current password is incorrect" },
        401
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const newHash = await hashPassword(new_password);

    await db
      .update(users)
      .set({
        password_hash: newHash,
        updated_at: now,
      })
      .where(eq(users.id, currentUser.id));

    if (revoke_other_sessions !== false) {
      await revokeAllUserRefreshTokens(db, currentUser.id);
    }

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, currentUser.id);

    const updatedUser: AuthUserResponse = {
      ...currentUser,
      app_roles,
      app_permissions,
      updated_at: now,
    };

    const accessTtl = resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS);
    const refreshTtl = resolveRefreshTokenTtl(c.env.REFRESH_TOKEN_TTL_SECONDS);

    const token = await signNiwaToken(
      updatedUser,
      c.env.JWT_SECRET,
      accessTtl
    );
    const issuedRefresh = await issueRefreshToken(db, {
      userId: currentUser.id,
      userAgent: c.req.header("User-Agent"),
      ttlSeconds: refreshTtl,
    });

    return c.json({
      message: "Password updated successfully",
      user: updatedUser,
      token,
      refresh_token: issuedRefresh.rawToken,
      expires_in: accessTtl,
    });
  }
);

// POST /api/v1/auth/roles/grant - Grant an app-scoped role and return refreshed token + user
authRoutes.post(
  "/roles/grant",
  authMiddleware,
  zValidator("json", grantAppRoleSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { app_id, role, user_id } = c.req.valid("json");
    const db = createDb(c.env.DB);

    await ensureRbacSeeded(db);

    const targetUserId = user_id ?? caller.id;
    const callerIsAdmin = isUserAdmin(caller, app_id);

    // Only admins can grant roles to another user or grant the 'admin' role
    if ((targetUserId !== caller.id || role === "admin") && !callerIsAdmin) {
      return c.json(
        {
          error: "Forbidden",
          message:
            "Administrator privileges are required to grant admin roles or modify another user's roles",
        },
        403
      );
    }

    const [targetRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.app_id, app_id), eq(roles.name, role)))
      .limit(1);

    if (!targetRole) {
      return c.json(
        {
          error: "NotFound",
          message: `Role '${role}' does not exist for app '${app_id}'`,
        },
        404
      );
    }

    const [targetUserRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUserRecord || !targetUserRecord.is_active) {
      return c.json(
        { error: "NotFound", message: "Target user not found or inactive" },
        404
      );
    }

    await db
      .insert(userAppRoles)
      .values({
        user_id: targetUserRecord.id,
        app_id: targetRole.app_id,
        role_id: targetRole.id,
      })
      .onConflictDoNothing();

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, targetUserRecord.id);

    const updatedUser: AuthUserResponse = {
      id: targetUserRecord.id,
      email: targetUserRecord.email,
      name: targetUserRecord.name,
      whatsapp_number: targetUserRecord.whatsapp_number,
      is_active: targetUserRecord.is_active,
      app_roles,
      app_permissions,
      created_at: targetUserRecord.created_at,
      updated_at: targetUserRecord.updated_at,
    };

    const accessTtl = resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS);
    const token = await signNiwaToken(
      updatedUser,
      c.env.JWT_SECRET,
      accessTtl
    );

    return c.json({
      user: updatedUser,
      token,
      expires_in: accessTtl,
    });
  }
);

// POST /api/v1/auth/roles/revoke - Revoke an app-scoped role from a user (Admin only)
authRoutes.post(
  "/roles/revoke",
  authMiddleware,
  zValidator("json", revokeAppRoleSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { app_id, role, user_id } = c.req.valid("json");
    const db = createDb(c.env.DB);

    await ensureRbacSeeded(db);

    if (!isUserAdmin(caller, app_id)) {
      return c.json(
        {
          error: "Forbidden",
          message: "Administrator privileges are required to revoke roles",
        },
        403
      );
    }

    if (user_id === caller.id && role === "admin") {
      return c.json(
        {
          error: "BadRequest",
          message: "You cannot revoke your own admin role",
        },
        400
      );
    }

    const [targetRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.app_id, app_id), eq(roles.name, role)))
      .limit(1);

    if (!targetRole) {
      return c.json(
        {
          error: "NotFound",
          message: `Role '${role}' does not exist for app '${app_id}'`,
        },
        404
      );
    }

    const [targetUserRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    if (!targetUserRecord) {
      return c.json(
        { error: "NotFound", message: "Target user not found" },
        404
      );
    }

    await db
      .delete(userAppRoles)
      .where(
        and(
          eq(userAppRoles.user_id, targetUserRecord.id),
          eq(userAppRoles.app_id, targetRole.app_id),
          eq(userAppRoles.role_id, targetRole.id)
        )
      );

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, targetUserRecord.id);

    const updatedUser: AuthUserResponse = {
      id: targetUserRecord.id,
      email: targetUserRecord.email,
      name: targetUserRecord.name,
      whatsapp_number: targetUserRecord.whatsapp_number,
      is_active: targetUserRecord.is_active,
      app_roles,
      app_permissions,
      created_at: targetUserRecord.created_at,
      updated_at: targetUserRecord.updated_at,
    };

    return c.json({
      user: updatedUser,
    });
  }
);
