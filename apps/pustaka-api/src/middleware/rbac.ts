import { createMiddleware } from "hono/factory";
import type { AppEnv, RoleName } from "../types";

/**
 * RBAC middleware checking that the authenticated user possesses at least one of the allowed roles.
 * Admin users automatically pass role checks.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    const hasRole =
      user.roles.includes("admin") ||
      allowedRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      return c.json(
        {
          error: "Forbidden",
          message: `Insufficient role privileges. Required: ${allowedRoles.join(" or ")}`,
        },
        403
      );
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
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    const isAdmin = user.roles.includes("admin");
    const hasPermissions =
      isAdmin ||
      requiredPermissions.every((perm) => user.permissions.includes(perm));

    if (!hasPermissions) {
      return c.json(
        {
          error: "Forbidden",
          message: `Missing required permission(s): ${requiredPermissions.join(", ")}`,
        },
        403
      );
    }

    await next();
  });
}
