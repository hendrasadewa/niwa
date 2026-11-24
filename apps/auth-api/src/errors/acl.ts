import { AppError } from "@niwa/api-core/errors";

export const AclErrors = {
  appAlreadyExists: (appId: string) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "ACL_APP_ALREADY_EXISTS",
      message: `App '${appId}' already exists`,
    }),

  appNotFound: (appId: string) =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ACL_APP_NOT_FOUND",
      message: `App '${appId}' not found`,
    }),

  roleAlreadyExists: (appId: string, name: string) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "ACL_ROLE_ALREADY_EXISTS",
      message: `Role '${name}' already exists for app '${appId}'`,
    }),

  roleNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ACL_ROLE_NOT_FOUND",
      message: "Role not found",
    }),

  roleNotFoundForApp: (appId: string, role: string) =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ACL_ROLE_NOT_FOUND",
      message: `Role '${role}' does not exist for app '${appId}'`,
    }),

  protectedRole: (name: string) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "ACL_PROTECTED_ROLE",
      message: `Built-in role '${name}' cannot be deleted`,
    }),

  unknownPermissionSlugs: (appId: string, missing: string[]) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "ACL_UNKNOWN_PERMISSION_SLUGS",
      message: `Unknown permission slug(s) for app '${appId}': ${missing.join(", ")}`,
    }),

  permissionAlreadyExists: (appId: string, slug: string) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "ACL_PERMISSION_ALREADY_EXISTS",
      message: `Permission '${slug}' already exists for app '${appId}'`,
    }),

  permissionNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ACL_PERMISSION_NOT_FOUND",
      message: "Permission not found",
    }),

  userNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ACL_USER_NOT_FOUND",
      message: "User not found",
    }),

  cannotDeactivateSelf: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "ACL_CANNOT_DEACTIVATE_SELF",
      message: "You cannot deactivate your own administrator account",
    }),

  cannotRevokeOwnAdmin: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "ACL_CANNOT_REVOKE_OWN_ADMIN",
      message: "You cannot revoke your own admin role",
    }),

  cannotRemoveLastAdmin: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "ACL_CANNOT_REMOVE_LAST_ADMIN",
      message: "You cannot remove your last remaining admin role",
    }),

  unknownRoleNames: (appId: string, missing: string[]) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "ACL_UNKNOWN_ROLE_NAMES",
      message: `Unknown role(s) for app '${appId}': ${missing.join(", ")}`,
    }),
};
