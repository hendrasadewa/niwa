import { createMiddleware } from "hono/factory";
import { AuthErrors } from "../errors/auth";
import { CommonErrors } from "../errors/common";
import type { RoleName } from "../types/auth";
import type { AppEnv } from "../types/env";

/**
 * RBAC middleware checking that the authenticated user possesses at least one of the allowed roles.
 * Admin users automatically pass role checks.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      throw CommonErrors.unauthorized();
    }

    const hasRole =
      user.roles.includes("admin") ||
      allowedRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw AuthErrors.insufficientRole(allowedRoles);
    }

    await next();
  });
}

/**
 * RBAC middleware checking that the authenticated user's roles grant all required permission slugs.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      throw CommonErrors.unauthorized();
    }

    const isAdmin = user.roles.includes("admin");
    const hasPermissions =
      isAdmin ||
      requiredPermissions.every((perm) => user.permissions.includes(perm));

    if (!hasPermissions) {
      throw AuthErrors.missingPermissions(requiredPermissions);
    }

    await next();
  });
}
