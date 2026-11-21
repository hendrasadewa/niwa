import { createMiddleware } from "hono/factory";
import { AppError } from "../errors/app-error";
import { AuthErrors } from "../errors/auth";
import { createRoleRepo } from "../repositories/roles";
import { createUserRepo } from "../repositories/users";
import type { AuthUserResponse, NiwaJwtPayload } from "../types/auth";
import type { AppEnv } from "../types/env";
import { verifyNiwaToken } from "../utils/jwt";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");

  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  } else if (queryToken) {
    token = queryToken.trim();
  }

  if (!token) {
    throw AuthErrors.missingAuthHeader();
  }

  let verified: NiwaJwtPayload;
  try {
    verified = await verifyNiwaToken(token, {
      activeKid: c.env.JWT_ACTIVE_KID,
      privateKeyJwk: c.env.JWT_PRIVATE_KEY_JWK,
      extraPublicJwks: c.env.JWT_PUBLIC_JWKS_EXTRA,
      issuer: c.env.JWT_ISSUER,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AuthErrors.invalidOrExpiredJwt();
  }

  if (!verified || typeof verified.sub !== "string") {
    throw AuthErrors.invalidJwtPayload();
  }

  const db = c.get("db");
  const userRepo = createUserRepo(db);
  const roleRepo = createRoleRepo(db);

  const userRecord = await userRepo.findById(verified.sub);
  if (!userRecord || !userRecord.is_active) {
    throw AuthErrors.userNotFoundOrInactive();
  }

  const { app_roles, app_permissions } =
    await roleRepo.getUserAppRolesAndPermissions(userRecord.id);

  const authUser: AuthUserResponse = {
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

  c.set("jwtPayload", verified);
  c.set("user", authUser);

  await next();
});
