import type { Context, Env } from "hono";
import { createMiddleware } from "hono/factory";
import type { AppError } from "../errors/app-error";
import { CommonErrors } from "../errors/common";

export type RbacUser<TRole extends string = string> = {
  roles: ReadonlyArray<TRole>;
  permissions?: ReadonlyArray<string>;
};

export type RbacEnv<TRole extends string = string> = Env & {
  Variables: {
    user?: RbacUser<TRole>;
  };
};

export type CreateRbacOptions<
  TEnv extends RbacEnv<TRole>,
  TRole extends string = string,
> = {
  adminRole?: TRole;
  getUser?: (c: Context<TEnv>) => RbacUser<TRole> | undefined;
  onUnauthorized?: () => AppError;
  onInsufficientRole?: (allowedRoles: TRole[]) => AppError;
  onMissingPermissions?: (requiredPermissions: string[]) => AppError;
};

export function createRbacMiddlewares<
  TEnv extends RbacEnv<TRole>,
  TRole extends string = string,
>(options: CreateRbacOptions<TEnv, TRole> = {}) {
  const adminRole = (options.adminRole ?? "admin") as TRole;
  const getUser =
    options.getUser ??
    ((c: Context<TEnv>) => c.get("user") as RbacUser<TRole> | undefined);
  const onUnauthorized =
    options.onUnauthorized ?? (() => CommonErrors.unauthorized());
  const onInsufficientRole =
    options.onInsufficientRole ??
    ((allowedRoles: TRole[]) =>
      CommonErrors.forbidden(
        `Access denied. Required role: ${allowedRoles.join(" or ")}`
      ));
  const onMissingPermissions =
    options.onMissingPermissions ??
    ((requiredPermissions: string[]) =>
      CommonErrors.forbidden(
        `Access denied. Missing required permissions: ${requiredPermissions.join(", ")}`
      ));

  function requireRole(...allowedRoles: TRole[]) {
    return createMiddleware<TEnv>(async (c, next) => {
      const user = getUser(c);
      if (!user) {
        throw onUnauthorized();
      }

      const hasRole =
        user.roles.includes(adminRole) ||
        allowedRoles.some((role) => user.roles.includes(role));

      if (!hasRole) {
        throw onInsufficientRole(allowedRoles);
      }

      await next();
    });
  }

  function requirePermission(...requiredPermissions: string[]) {
    return createMiddleware<TEnv>(async (c, next) => {
      const user = getUser(c);
      if (!user) {
        throw onUnauthorized();
      }

      const isAdmin = user.roles.includes(adminRole);
      const userPermissions = user.permissions ?? [];
      const hasPermissions =
        isAdmin ||
        requiredPermissions.every((perm) => userPermissions.includes(perm));

      if (!hasPermissions) {
        throw onMissingPermissions(requiredPermissions);
      }

      await next();
    });
  }

  return {
    requireRole,
    requirePermission,
  };
}
