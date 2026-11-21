import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { requirePermission } from "../middlewares/rbac";
import { createAuthApiRepo } from "../repositories/auth-api";
import { createUserService } from "../services/users";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import { assignRoleSchema } from "../validators/auth";

function getUserService(c: Context<AppEnv>) {
  return createUserService({
    authApiRepo: createAuthApiRepo({
      authApi: c.env.AUTH_API,
      authApiUrl: c.env.AUTH_API_URL,
    }),
  });
}

export const usersRoutes = new Hono<AppEnv>();

// GET /api/v1/users/profile
usersRoutes.get("/profile", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// GET /api/v1/users
usersRoutes.get(
  "/",
  authMiddleware,
  requirePermission("users:manage"),
  async (c) => {
    const authToken = c.get("authToken");
    const search = c.req.query("search");
    const result = await getUserService(c).listUsers({ authToken, search });
    return c.json(result);
  }
);

// POST /api/v1/users/:id/roles
usersRoutes.post(
  "/:id/roles",
  authMiddleware,
  requirePermission("users:manage"),
  validate("json", assignRoleSchema),
  async (c) => {
    const authToken = c.get("authToken");
    const targetUserId = c.req.param("id");
    const { role } = c.req.valid("json");
    const user = await getUserService(c).assignRole({
      authToken,
      targetUserId,
      role,
    });
    return c.json({ user });
  }
);
