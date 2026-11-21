import { createMiddleware } from "hono/factory";
import { AppError } from "../errors/app-error";
import { AuthErrors } from "../errors/auth";
import type { NiwaJwtPayload, RoleName } from "../types/auth";
import type { AppEnv } from "../types/env";
import { PUSTAKA_APP_ID } from "../utils/auth";
import { verifyNiwaToken } from "../utils/jwt";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw AuthErrors.missingAuthHeader();
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw AuthErrors.missingBearerToken();
  }

  let verified: NiwaJwtPayload;
  try {
    verified = await verifyNiwaToken(token, c.env.JWT_SECRET);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AuthErrors.invalidOrExpiredJwt();
  }

  if (
    !verified ||
    typeof verified.sub !== "string" ||
    typeof verified.email !== "string" ||
    typeof verified.name !== "string"
  ) {
    throw AuthErrors.invalidTokenPayload();
  }

  const pustakaRoles = Array.isArray(verified.app_roles?.[PUSTAKA_APP_ID])
    ? (verified.app_roles[PUSTAKA_APP_ID] as RoleName[])
    : [];
  const pustakaPermissions = Array.isArray(
    verified.app_permissions?.[PUSTAKA_APP_ID]
  )
    ? verified.app_permissions[PUSTAKA_APP_ID]
    : [];

  c.set("jwtPayload", verified);
  c.set("authToken", token);
  c.set("user", {
    id: verified.sub,
    username: verified.name,
    email: verified.email,
    roles: pustakaRoles,
    permissions: pustakaPermissions,
    created_at: verified.created_at ?? verified.iat,
  });

  await next();
});
