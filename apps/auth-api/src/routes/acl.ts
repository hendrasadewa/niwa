import { zValidator } from "@hono/zod-validator";
import {
  aclUsersQuerySchema,
  appFilterQuerySchema,
  createAppSchema,
  createPermissionSchema,
  createRoleSchema,
  permissionIdParamSchema,
  roleIdParamSchema,
  setUserAppRolesSchema,
  updateRolePermissionsSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  userRoleMutationSchema,
} from "@niwa/auth-validators";
import { and, desc, eq, gt, inArray, isNull, like, or, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import {
  apps,
  createDb,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  userAppRoles,
  users,
} from "../db";
import {
  ensureRbacSeeded,
  getUserAppRolesAndPermissions,
} from "../db/rbac";
import { authMiddleware } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import type { AppEnv, AuthUserResponse } from "../types";
import { revokeAllUserRefreshTokens } from "../utils/refresh-token";

const PROTECTED_ROLE_NAMES = new Set(["admin", "member"]);

export const aclRoutes = new Hono<AppEnv>();

// Every ACL & Role Management endpoint requires an authenticated Admin
aclRoutes.use("*", authMiddleware, requireAdmin);

// ============================================================================
// APPS CATALOG
// ============================================================================

// GET /api/v1/acl/apps - List registered applications with their roles and permissions
aclRoutes.get(
  "/apps",
  zValidator("query", appFilterQuerySchema),
  async (c) => {
    const { app_id } = c.req.valid("query");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const appRows = app_id
      ? await db.select().from(apps).where(eq(apps.id, app_id))
      : await db.select().from(apps);

    const roleRows = app_id
      ? await db.select().from(roles).where(eq(roles.app_id, app_id))
      : await db.select().from(roles);

    const permRows = app_id
      ? await db
          .select()
          .from(permissions)
          .where(eq(permissions.app_id, app_id))
      : await db.select().from(permissions);

    const rpRows = await db
      .select({
        role_id: rolePermissions.role_id,
        slug: permissions.slug,
      })
      .from(rolePermissions)
      .innerJoin(
        permissions,
        eq(rolePermissions.permission_id, permissions.id)
      );

    const permsByRoleId = new Map<string, string[]>();
    for (const rp of rpRows) {
      const list = permsByRoleId.get(rp.role_id) ?? [];
      list.push(rp.slug);
      permsByRoleId.set(rp.role_id, list);
    }

    const enrichedApps = appRows.map((app) => ({
      ...app,
      roles: roleRows
        .filter((r) => r.app_id === app.id)
        .map((r) => ({
          ...r,
          permissions: permsByRoleId.get(r.id) ?? [],
        })),
      permissions: permRows.filter((p) => p.app_id === app.id),
    }));

    return c.json({ apps: enrichedApps });
  }
);

// POST /api/v1/acl/apps - Register a new Niwa application (automatically seeds admin & member roles)
aclRoutes.post("/apps", zValidator("json", createAppSchema), async (c) => {
  const { id, name, description } = c.req.valid("json");
  const db = createDb(c.env.DB);
  await ensureRbacSeeded(db);

  const [existing] = await db
    .select({ id: apps.id })
    .from(apps)
    .where(eq(apps.id, id))
    .limit(1);

  if (existing) {
    return c.json(
      { error: "Conflict", message: `App '${id}' already exists` },
      409
    );
  }

  const newApp = { id, name, description };
  await db.insert(apps).values(newApp);

  // Seed default admin and member roles for the new app
  const defaultAppRoles = [
    {
      id: `${id}:role-admin`,
      app_id: id,
      name: "admin",
      description: `Administrator role for ${name}`,
    },
    {
      id: `${id}:role-member`,
      app_id: id,
      name: "member",
      description: `Default member role for ${name}`,
    },
  ];
  await db.insert(roles).values(defaultAppRoles).onConflictDoNothing();

  return c.json(
    {
      app: {
        ...newApp,
        roles: defaultAppRoles.map((r) => ({ ...r, permissions: [] })),
        permissions: [],
      },
    },
    201
  );
});

// ============================================================================
// ROLES & ROLE-PERMISSION MATRIX
// ============================================================================

// GET /api/v1/acl/roles - List roles with attached permission slugs
aclRoutes.get(
  "/roles",
  zValidator("query", appFilterQuerySchema),
  async (c) => {
    const { app_id } = c.req.valid("query");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const roleRows = app_id
      ? await db.select().from(roles).where(eq(roles.app_id, app_id))
      : await db.select().from(roles);

    const roleIds = roleRows.map((r) => r.id);
    const permsByRole = new Map<string, string[]>();

    if (roleIds.length > 0) {
      const rpRows = await db
        .select({
          role_id: rolePermissions.role_id,
          slug: permissions.slug,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permission_id, permissions.id)
        )
        .where(inArray(rolePermissions.role_id, roleIds));

      for (const row of rpRows) {
        const list = permsByRole.get(row.role_id) ?? [];
        list.push(row.slug);
        permsByRole.set(row.role_id, list);
      }
    }

    return c.json({
      roles: roleRows.map((r) => ({
        ...r,
        permissions: permsByRole.get(r.id) ?? [],
      })),
    });
  }
);

// POST /api/v1/acl/roles - Create a new app-scoped role (with optional initial permission_slugs)
aclRoutes.post("/roles", zValidator("json", createRoleSchema), async (c) => {
  const { app_id, name, description, permission_slugs } = c.req.valid("json");
  const db = createDb(c.env.DB);
  await ensureRbacSeeded(db);

  const [appRecord] = await db
    .select({ id: apps.id })
    .from(apps)
    .where(eq(apps.id, app_id))
    .limit(1);

  if (!appRecord) {
    return c.json(
      { error: "NotFound", message: `App '${app_id}' not found` },
      404
    );
  }

  const [existingRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.app_id, app_id), eq(roles.name, name)))
    .limit(1);

  if (existingRole) {
    return c.json(
      {
        error: "Conflict",
        message: `Role '${name}' already exists for app '${app_id}'`,
      },
      409
    );
  }

  const roleId = `${app_id}:role-${name}`;
  const newRole = { id: roleId, app_id, name, description };

  let matchedPermissions: Array<{ id: string; slug: string }> = [];
  if (permission_slugs && permission_slugs.length > 0) {
    const uniqueSlugs = Array.from(new Set(permission_slugs));
    matchedPermissions = await db
      .select({ id: permissions.id, slug: permissions.slug })
      .from(permissions)
      .where(
        and(
          eq(permissions.app_id, app_id),
          inArray(permissions.slug, uniqueSlugs)
        )
      );

    if (matchedPermissions.length !== uniqueSlugs.length) {
      const foundSlugs = new Set(matchedPermissions.map((p) => p.slug));
      const missing = uniqueSlugs.filter((s) => !foundSlugs.has(s));
      return c.json(
        {
          error: "BadRequest",
          message: `Unknown permission slug(s) for app '${app_id}': ${missing.join(", ")}`,
        },
        400
      );
    }
  }

  await db.insert(roles).values(newRole);

  if (matchedPermissions.length > 0) {
    await db
      .insert(rolePermissions)
      .values(
        matchedPermissions.map((p) => ({
          role_id: roleId,
          permission_id: p.id,
        }))
      )
      .onConflictDoNothing();
  }

  return c.json(
    {
      role: {
        ...newRole,
        permissions: matchedPermissions.map((p) => p.slug),
      },
    },
    201
  );
});

// PUT /api/v1/acl/roles/:roleId/permissions - Replace permission set assigned to a role
aclRoutes.put(
  "/roles/:roleId/permissions",
  zValidator("param", roleIdParamSchema),
  zValidator("json", updateRolePermissionsSchema),
  async (c) => {
    const { roleId } = c.req.valid("param");
    const { permission_slugs } = c.req.valid("json");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const [roleRecord] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!roleRecord) {
      return c.json({ error: "NotFound", message: "Role not found" }, 404);
    }

    const uniqueSlugs = Array.from(new Set(permission_slugs));
    let matchedPermissions: Array<{ id: string; slug: string }> = [];

    if (uniqueSlugs.length > 0) {
      matchedPermissions = await db
        .select({ id: permissions.id, slug: permissions.slug })
        .from(permissions)
        .where(
          and(
            eq(permissions.app_id, roleRecord.app_id),
            inArray(permissions.slug, uniqueSlugs)
          )
        );

      if (matchedPermissions.length !== uniqueSlugs.length) {
        const foundSlugs = new Set(matchedPermissions.map((p) => p.slug));
        const missing = uniqueSlugs.filter((s) => !foundSlugs.has(s));
        return c.json(
          {
            error: "BadRequest",
            message: `Unknown permission slug(s) for app '${roleRecord.app_id}': ${missing.join(", ")}`,
          },
          400
        );
      }
    }

    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.role_id, roleRecord.id));

    if (matchedPermissions.length > 0) {
      await db
        .insert(rolePermissions)
        .values(
          matchedPermissions.map((p) => ({
            role_id: roleRecord.id,
            permission_id: p.id,
          }))
        )
        .onConflictDoNothing();
    }

    return c.json({
      role: {
        ...roleRecord,
        permissions: matchedPermissions.map((p) => p.slug),
      },
    });
  }
);

// DELETE /api/v1/acl/roles/:roleId - Delete a custom role
aclRoutes.delete(
  "/roles/:roleId",
  zValidator("param", roleIdParamSchema),
  async (c) => {
    const { roleId } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [roleRecord] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!roleRecord) {
      return c.json({ error: "NotFound", message: "Role not found" }, 404);
    }

    if (PROTECTED_ROLE_NAMES.has(roleRecord.name)) {
      return c.json(
        {
          error: "BadRequest",
          message: `Built-in role '${roleRecord.name}' cannot be deleted`,
        },
        400
      );
    }

    await db.delete(roles).where(eq(roles.id, roleRecord.id));

    return c.json({
      message: "Role deleted successfully",
      id: roleRecord.id,
    });
  }
);

// ============================================================================
// PERMISSIONS CATALOG
// ============================================================================

// GET /api/v1/acl/permissions - List permissions
aclRoutes.get(
  "/permissions",
  zValidator("query", appFilterQuerySchema),
  async (c) => {
    const { app_id } = c.req.valid("query");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const permRows = app_id
      ? await db
          .select()
          .from(permissions)
          .where(eq(permissions.app_id, app_id))
      : await db.select().from(permissions);

    return c.json({ permissions: permRows });
  }
);

// POST /api/v1/acl/permissions - Create a new app-scoped permission
aclRoutes.post(
  "/permissions",
  zValidator("json", createPermissionSchema),
  async (c) => {
    const { app_id, slug, description } = c.req.valid("json");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const [appRecord] = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, app_id))
      .limit(1);

    if (!appRecord) {
      return c.json(
        { error: "NotFound", message: `App '${app_id}' not found` },
        404
      );
    }

    const [existing] = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(and(eq(permissions.app_id, app_id), eq(permissions.slug, slug)))
      .limit(1);

    if (existing) {
      return c.json(
        {
          error: "Conflict",
          message: `Permission '${slug}' already exists for app '${app_id}'`,
        },
        409
      );
    }

    const newPerm = {
      id: `${app_id}:perm-${slug.replace(/[^a-z0-9]+/g, "-")}`,
      app_id,
      slug,
      description,
    };

    await db.insert(permissions).values(newPerm);

    return c.json({ permission: newPerm }, 201);
  }
);

// DELETE /api/v1/acl/permissions/:permissionId - Delete a permission
aclRoutes.delete(
  "/permissions/:permissionId",
  zValidator("param", permissionIdParamSchema),
  async (c) => {
    const { permissionId } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [perm] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, permissionId))
      .limit(1);

    if (!perm) {
      return c.json(
        { error: "NotFound", message: "Permission not found" },
        404
      );
    }

    await db.delete(permissions).where(eq(permissions.id, perm.id));

    return c.json({
      message: "Permission deleted successfully",
      id: perm.id,
    });
  }
);

// ============================================================================
// USER MANAGEMENT & USER ROLE ASSIGNMENTS
// ============================================================================

// GET /api/v1/acl/users - List users with app_roles & app_permissions
aclRoutes.get(
  "/users",
  zValidator("query", aclUsersQuerySchema),
  async (c) => {
    const { search, app_id, role, is_active } = c.req.valid("query");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const conditions: SQL[] = [];
    if (search) {
      const pattern = `%${search}%`;
      const searchCond = or(
        like(users.email, pattern),
        like(users.name, pattern),
        like(users.whatsapp_number, pattern)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }
    if (is_active !== undefined) {
      conditions.push(eq(users.is_active, is_active));
    }

    const baseQuery = db.select().from(users).orderBy(desc(users.created_at));
    const userRows =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;

    const enriched: AuthUserResponse[] = await Promise.all(
      userRows.map(async (u) => {
        const { app_roles, app_permissions } =
          await getUserAppRolesAndPermissions(db, u.id);
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          whatsapp_number: u.whatsapp_number,
          is_active: u.is_active,
          app_roles,
          app_permissions,
          created_at: u.created_at,
          updated_at: u.updated_at,
        };
      })
    );

    const filtered = enriched.filter((u) => {
      if (app_id && role) {
        return Boolean(u.app_roles[app_id]?.includes(role));
      }
      if (app_id) {
        return Boolean(u.app_roles[app_id] && u.app_roles[app_id].length > 0);
      }
      if (role) {
        return Object.values(u.app_roles).some((list) => list.includes(role));
      }
      return true;
    });

    return c.json({
      total: filtered.length,
      users: filtered,
    });
  }
);

// GET /api/v1/acl/users/:userId - Inspect a single user with RBAC claims & active session count
aclRoutes.get(
  "/users/:userId",
  zValidator("param", userIdParamSchema),
  async (c) => {
    const { userId } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return c.json({ error: "NotFound", message: "User not found" }, 404);
    }

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userRecord.id);

    const now = Math.floor(Date.now() / 1000);
    const activeSessions = await db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.user_id, userRecord.id),
          isNull(refreshTokens.revoked_at),
          gt(refreshTokens.expires_at, now)
        )
      );

    return c.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        whatsapp_number: userRecord.whatsapp_number,
        is_active: userRecord.is_active,
        app_roles,
        app_permissions,
        created_at: userRecord.created_at,
        updated_at: userRecord.updated_at,
        active_sessions_count: activeSessions.length,
      },
    });
  }
);

// PATCH /api/v1/acl/users/:userId/status - Activate or deactivate a user (deactivation revokes all refresh tokens)
aclRoutes.patch(
  "/users/:userId/status",
  zValidator("param", userIdParamSchema),
  zValidator("json", updateUserStatusSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { userId } = c.req.valid("param");
    const { is_active } = c.req.valid("json");
    const db = createDb(c.env.DB);

    if (userId === caller.id && !is_active) {
      return c.json(
        {
          error: "BadRequest",
          message: "You cannot deactivate your own administrator account",
        },
        400
      );
    }

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return c.json({ error: "NotFound", message: "User not found" }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    await db
      .update(users)
      .set({ is_active, updated_at: now })
      .where(eq(users.id, userRecord.id));

    let revokedSessions = 0;
    if (!is_active) {
      revokedSessions = await revokeAllUserRefreshTokens(db, userRecord.id);
    }

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userRecord.id);

    return c.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        whatsapp_number: userRecord.whatsapp_number,
        is_active,
        app_roles,
        app_permissions,
        created_at: userRecord.created_at,
        updated_at: now,
      },
      revoked_sessions: revokedSessions,
    });
  }
);

// POST /api/v1/acl/users/:userId/roles - Grant an app role to a user
aclRoutes.post(
  "/users/:userId/roles",
  zValidator("param", userIdParamSchema),
  zValidator("json", userRoleMutationSchema),
  async (c) => {
    const { userId } = c.req.valid("param");
    const { app_id, role } = c.req.valid("json");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return c.json({ error: "NotFound", message: "User not found" }, 404);
    }

    const [roleRecord] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.app_id, app_id), eq(roles.name, role)))
      .limit(1);

    if (!roleRecord) {
      return c.json(
        {
          error: "NotFound",
          message: `Role '${role}' does not exist for app '${app_id}'`,
        },
        404
      );
    }

    await db
      .insert(userAppRoles)
      .values({
        user_id: userRecord.id,
        app_id: roleRecord.app_id,
        role_id: roleRecord.id,
      })
      .onConflictDoNothing();

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userRecord.id);

    return c.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        whatsapp_number: userRecord.whatsapp_number,
        is_active: userRecord.is_active,
        app_roles,
        app_permissions,
        created_at: userRecord.created_at,
        updated_at: userRecord.updated_at,
      },
    });
  }
);

// DELETE /api/v1/acl/users/:userId/roles - Revoke an app role from a user
aclRoutes.delete(
  "/users/:userId/roles",
  zValidator("param", userIdParamSchema),
  zValidator("json", userRoleMutationSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { userId } = c.req.valid("param");
    const { app_id, role } = c.req.valid("json");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    if (userId === caller.id && role === "admin") {
      return c.json(
        {
          error: "BadRequest",
          message: "You cannot revoke your own admin role",
        },
        400
      );
    }

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return c.json({ error: "NotFound", message: "User not found" }, 404);
    }

    const [roleRecord] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.app_id, app_id), eq(roles.name, role)))
      .limit(1);

    if (!roleRecord) {
      return c.json(
        {
          error: "NotFound",
          message: `Role '${role}' does not exist for app '${app_id}'`,
        },
        404
      );
    }

    await db
      .delete(userAppRoles)
      .where(
        and(
          eq(userAppRoles.user_id, userRecord.id),
          eq(userAppRoles.app_id, roleRecord.app_id),
          eq(userAppRoles.role_id, roleRecord.id)
        )
      );

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userRecord.id);

    return c.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        whatsapp_number: userRecord.whatsapp_number,
        is_active: userRecord.is_active,
        app_roles,
        app_permissions,
        created_at: userRecord.created_at,
        updated_at: userRecord.updated_at,
      },
    });
  }
);

// PUT /api/v1/acl/users/:userId/roles - Replace all roles for a user within a specific app
aclRoutes.put(
  "/users/:userId/roles",
  zValidator("param", userIdParamSchema),
  zValidator("json", setUserAppRolesSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { userId } = c.req.valid("param");
    const { app_id, roles: roleNames } = c.req.valid("json");
    const db = createDb(c.env.DB);
    await ensureRbacSeeded(db);

    const uniqueRoleNames = Array.from(new Set(roleNames));

    if (userId === caller.id && !uniqueRoleNames.includes("admin")) {
      const callerHasOtherAppAdmin = Object.entries(caller.app_roles).some(
        ([k, list]) => k !== app_id && list.includes("admin")
      );
      if (!callerHasOtherAppAdmin) {
        return c.json(
          {
            error: "BadRequest",
            message: "You cannot remove your last remaining admin role",
          },
          400
        );
      }
    }

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return c.json({ error: "NotFound", message: "User not found" }, 404);
    }

    const [appRecord] = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.id, app_id))
      .limit(1);

    if (!appRecord) {
      return c.json(
        { error: "NotFound", message: `App '${app_id}' not found` },
        404
      );
    }

    let targetRoles: Array<{ id: string; name: string }> = [];
    if (uniqueRoleNames.length > 0) {
      targetRoles = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(
          and(
            eq(roles.app_id, app_id),
            inArray(roles.name, uniqueRoleNames)
          )
        );

      if (targetRoles.length !== uniqueRoleNames.length) {
        const foundNames = new Set(targetRoles.map((r) => r.name));
        const missing = uniqueRoleNames.filter((n) => !foundNames.has(n));
        return c.json(
          {
            error: "BadRequest",
            message: `Unknown role(s) for app '${app_id}': ${missing.join(", ")}`,
          },
          400
        );
      }
    }

    await db
      .delete(userAppRoles)
      .where(
        and(
          eq(userAppRoles.user_id, userRecord.id),
          eq(userAppRoles.app_id, app_id)
        )
      );

    if (targetRoles.length > 0) {
      await db
        .insert(userAppRoles)
        .values(
          targetRoles.map((r) => ({
            user_id: userRecord.id,
            app_id,
            role_id: r.id,
          }))
        )
        .onConflictDoNothing();
    }

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userRecord.id);

    return c.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        whatsapp_number: userRecord.whatsapp_number,
        is_active: userRecord.is_active,
        app_roles,
        app_permissions,
        created_at: userRecord.created_at,
        updated_at: userRecord.updated_at,
      },
    });
  }
);
