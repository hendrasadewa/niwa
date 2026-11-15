import { zValidator } from "@hono/zod-validator";
import { assignRoleSchema } from "@niwa/pustaka-validators";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb, roles, userRoles, users } from "../db";
import { ensureRbacSeeded, getUserRolesAndPermissions } from "../db/rbac";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppEnv } from "../types";

export const usersRoutes = new Hono<AppEnv>();

usersRoutes.get("/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

usersRoutes.post(
  "/:id/roles",
  authMiddleware,
  requirePermission("users:manage"),
  zValidator("json", assignRoleSchema),
  async (c) => {
    const targetUserId = c.req.param("id");
    const { role } = c.req.valid("json");
    const db = createDb(c.env.DB);

    await ensureRbacSeeded(db);

    const [targetUser] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return c.json({ error: "NotFound", message: "User not found" }, 404);
    }

    const [roleRecord] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, role))
      .limit(1);

    if (!roleRecord) {
      return c.json({ error: "NotFound", message: "Role not found" }, 404);
    }

    await db
      .insert(userRoles)
      .values({
        user_id: targetUserId,
        role_id: roleRecord.id,
      })
      .onConflictDoNothing();

    const resolved = await getUserRolesAndPermissions(db, targetUserId);

    return c.json({
      user: {
        ...targetUser,
        roles: resolved.roles,
        permissions: resolved.permissions,
      },
    });
  }
);
