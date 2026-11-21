import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { createAppRepo } from "../../repositories/apps";
import { createRefreshTokenRepo } from "../../repositories/refresh-tokens";
import { createRoleRepo } from "../../repositories/roles";
import { createUserRepo } from "../../repositories/users";
import { createUserService } from "../../services/users";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  aclUsersQuerySchema,
  setUserAppRolesSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  userRoleMutationSchema,
} from "../../validators/acl";

function getUserService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createUserService({
    userRepo: createUserRepo(db),
    appRepo: createAppRepo(db),
    roleRepo: createRoleRepo(db),
    refreshTokenRepo: createRefreshTokenRepo(db),
    ensureSeeded: () => ensureRbacSeeded(db),
  });
}

export const aclUsersRoutes = new Hono<AppEnv>();

// GET /api/v1/acl/users
aclUsersRoutes.get("/", validate("query", aclUsersQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const result = await getUserService(c).listUsers(query);
  return c.json(result);
});

// GET /api/v1/acl/users/:userId
aclUsersRoutes.get(
  "/:userId",
  validate("param", userIdParamSchema),
  async (c) => {
    const { userId } = c.req.valid("param");
    const user = await getUserService(c).getUser(userId);
    return c.json({ user });
  }
);

// PATCH /api/v1/acl/users/:userId/status
aclUsersRoutes.patch(
  "/:userId/status",
  validate("param", userIdParamSchema),
  validate("json", updateUserStatusSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { userId } = c.req.valid("param");
    const { is_active } = c.req.valid("json");
    const result = await getUserService(c).updateStatus({
      callerId: caller.id,
      userId,
      is_active,
    });
    return c.json(result);
  }
);

// POST /api/v1/acl/users/:userId/roles
aclUsersRoutes.post(
  "/:userId/roles",
  validate("param", userIdParamSchema),
  validate("json", userRoleMutationSchema),
  async (c) => {
    const { userId } = c.req.valid("param");
    const { app_id, role } = c.req.valid("json");
    const user = await getUserService(c).grantRole({ userId, app_id, role });
    return c.json({ user });
  }
);

// DELETE /api/v1/acl/users/:userId/roles
aclUsersRoutes.delete(
  "/:userId/roles",
  validate("param", userIdParamSchema),
  validate("json", userRoleMutationSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { userId } = c.req.valid("param");
    const { app_id, role } = c.req.valid("json");
    const user = await getUserService(c).revokeRole({
      callerId: caller.id,
      userId,
      app_id,
      role,
    });
    return c.json({ user });
  }
);

// PUT /api/v1/acl/users/:userId/roles
aclUsersRoutes.put(
  "/:userId/roles",
  validate("param", userIdParamSchema),
  validate("json", setUserAppRolesSchema),
  async (c) => {
    const caller = c.get("user")!;
    const { userId } = c.req.valid("param");
    const { app_id, roles } = c.req.valid("json");
    const user = await getUserService(c).setAppRoles({
      caller,
      userId,
      app_id,
      roles,
    });
    return c.json({ user });
  }
);
