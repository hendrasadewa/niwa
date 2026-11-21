import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { authMiddleware } from "../../middlewares/auth";
import { createRoleRepo } from "../../repositories/roles";
import { createUserRepo } from "../../repositories/users";
import { createProfileService } from "../../services/profile";
import type { AppEnv } from "../../types/env";
import { resolveAccessTokenTtl } from "../../utils/jwt";
import { validate } from "../../validators";
import {
  grantAppRoleSchema,
  revokeAppRoleSchema,
  updateUserSchema,
} from "../../validators/auth";

function getProfileService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createProfileService({
    userRepo: createUserRepo(db),
    roleRepo: createRoleRepo(db),
    ensureSeeded: () => ensureRbacSeeded(db),
    config: {
      jwtSecret: c.env.JWT_SECRET,
      accessTokenTtl: resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS),
    },
  });
}

export const authProfileRoutes = new Hono<AppEnv>();

// GET /api/v1/auth/me & alias GET /api/v1/auth/profile
authProfileRoutes.get("/me", authMiddleware, (c) => {
  const user = c.get("user")!;
  return c.json({ user });
});

authProfileRoutes.get("/profile", authMiddleware, (c) => {
  const user = c.get("user")!;
  return c.json({ user });
});

// PUT /api/v1/auth/me
authProfileRoutes.put(
  "/me",
  authMiddleware,
  validate("json", updateUserSchema),
  async (c) => {
    const currentUser = c.get("user")!;
    const updates = c.req.valid("json");
    const result = await getProfileService(c).updateProfile({
      currentUser,
      ...updates,
    });
    return c.json(result);
  }
);

// POST /api/v1/auth/roles/grant
authProfileRoutes.post(
  "/roles/grant",
  authMiddleware,
  validate("json", grantAppRoleSchema),
  async (c) => {
    const caller = c.get("user")!;
    const body = c.req.valid("json");
    const result = await getProfileService(c).grantRole({
      caller,
      ...body,
    });
    return c.json(result);
  }
);

// POST /api/v1/auth/roles/revoke
authProfileRoutes.post(
  "/roles/revoke",
  authMiddleware,
  validate("json", revokeAppRoleSchema),
  async (c) => {
    const caller = c.get("user")!;
    const body = c.req.valid("json");
    const result = await getProfileService(c).revokeRole({
      caller,
      ...body,
    });
    return c.json(result);
  }
);
