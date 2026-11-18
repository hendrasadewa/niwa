import { zValidator } from "@hono/zod-validator";
import { loginSchema, registerSchema } from "@niwa/open-po-validators";
import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { createDb, stores, userRoles, users } from "../db";
import { ensureRbacSeeded, getUserRolesAndPermissions } from "../db/rbac";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv, JwtUserPayload } from "../types";
import { hashPassword, verifyPassword } from "../utils/password";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const authRoutes = new Hono<AppEnv>();

authRoutes.post(
  "/register",
  zValidator("json", registerSchema),
  async (c) => {
    const {
      email,
      password,
      name,
      whatsapp_number,
      default_shipping_address,
      role,
    } = c.req.valid("json");
    const normalizedEmail = email.toLowerCase();
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
    const createdAt = Math.floor(Date.now() / 1000);
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      name,
      whatsapp_number,
      default_shipping_address: default_shipping_address ?? null,
      created_at: createdAt,
    });

    const roleMappings: Array<{ user_id: string; role_id: string }> = [
      { user_id: userId, role_id: "role-member" },
    ];
    if (role === "seller" || isFirstUser || isConfiguredAdmin) {
      roleMappings.push({ user_id: userId, role_id: "role-seller" });
    }
    if (isFirstUser || isConfiguredAdmin) {
      roleMappings.push({ user_id: userId, role_id: "role-admin" });
    }

    await db.insert(userRoles).values(roleMappings).onConflictDoNothing();

    const { roles, permissions } = await getUserRolesAndPermissions(db, userId);
    const now = Math.floor(Date.now() / 1000);

    const jwtPayload: JwtUserPayload = {
      sub: userId,
      name,
      email: normalizedEmail,
      roles,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    };

    const token = await sign(jwtPayload, c.env.JWT_SECRET, "HS256");

    return c.json(
      {
        user: {
          id: userId,
          name,
          email: normalizedEmail,
          whatsapp_number,
          default_shipping_address: default_shipping_address ?? null,
          roles,
          permissions,
          created_at: createdAt,
        },
        token,
      },
      201
    );
  }
);

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

  if (!userRecord) {
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

  const { roles, permissions } = await getUserRolesAndPermissions(
    db,
    userRecord.id
  );
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload: JwtUserPayload = {
    sub: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    roles,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const token = await sign(jwtPayload, c.env.JWT_SECRET, "HS256");

  return c.json({
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      whatsapp_number: userRecord.whatsapp_number,
      default_shipping_address: userRecord.default_shipping_address,
      roles,
      permissions,
      created_at: userRecord.created_at,
    },
    token,
  });
});

authRoutes.get("/profile", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = createDb(c.env.DB);
  const ownedStores = await db
    .select()
    .from(stores)
    .where(eq(stores.owner_id, user.id));

  return c.json({
    user,
    stores: ownedStores,
  });
});
