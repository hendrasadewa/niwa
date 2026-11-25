import { AppError } from "@niwa/api-core/errors";
import { createMiddleware } from "hono/factory";
import { AuthErrors } from "../errors/auth";
import type { AuthUser, NiwaJwtPayload, RoleName } from "../types/auth";
import type { AppEnv, Bindings } from "../types/env";
import { BLOG_APP_ID } from "../utils/auth";
import { verifyNiwaToken } from "../utils/jwt";

async function authenticateBearerToken(
  token: string,
  env: Bindings
): Promise<{ verified: NiwaJwtPayload; user: AuthUser }> {
  let verified: NiwaJwtPayload;
  try {
    verified = await verifyNiwaToken(token, {
      authApi: env.AUTH_API,
      authApiUrl: env.AUTH_API_URL,
      issuer: env.JWT_ISSUER,
    });
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

  const blogRoles = Array.isArray(verified.roles)
    ? (verified.roles as RoleName[])
    : Array.isArray(verified.app_roles?.[BLOG_APP_ID])
      ? (verified.app_roles[BLOG_APP_ID] as RoleName[])
      : [];
  const blogPermissions = Array.isArray(verified.permissions)
    ? verified.permissions
    : Array.isArray(verified.app_permissions?.[BLOG_APP_ID])
      ? verified.app_permissions[BLOG_APP_ID]
      : [];

  return {
    verified,
    user: {
      id: verified.sub,
      username: verified.name,
      email: verified.email,
      roles: blogRoles,
      permissions: blogPermissions,
      created_at: verified.created_at ?? verified.iat,
    },
  };
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw AuthErrors.missingAuthHeader();
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw AuthErrors.missingBearerToken();
  }

  const { verified, user } = await authenticateBearerToken(token, c.env);

  c.set("jwtPayload", verified);
  c.set("authToken", token);
  c.set("user", user);

  await next();
});
