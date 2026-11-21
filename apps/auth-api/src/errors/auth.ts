import { AppError } from "./app-error";

export const AuthErrors = {
  emailAlreadyRegistered: () =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "AUTH_EMAIL_ALREADY_REGISTERED",
      message: "Email is already registered",
    }),

  invalidCredentials: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid email or password",
    }),

  invalidCurrentPassword: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_INVALID_CURRENT_PASSWORD",
      message: "Current password is incorrect",
    }),

  missingAuthHeader: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_MISSING_TOKEN",
      message: "Missing or invalid Authorization header",
    }),

  invalidJwtPayload: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_INVALID_TOKEN_PAYLOAD",
      message: "Invalid JWT token payload",
    }),

  invalidOrExpiredJwt: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_INVALID_OR_EXPIRED_TOKEN",
      message: "Invalid or expired JWT token",
    }),

  userNotFoundOrInactive: (message = "User not found or inactive") =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_USER_INACTIVE_OR_MISSING",
      message,
    }),

  refreshTokenInvalid: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_REFRESH_TOKEN_INVALID",
      message: "Invalid refresh token",
    }),

  refreshTokenReused: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_REFRESH_TOKEN_REUSED",
      message: "Refresh token reuse detected; session has been revoked",
    }),

  refreshTokenExpired: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_REFRESH_TOKEN_EXPIRED",
      message: "Refresh token has expired",
    }),

  adminRequired: (
    message = "Administrator privileges are required to access this resource"
  ) =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "AUTH_ADMIN_REQUIRED",
      message,
    }),

  adminRequiredForGrant: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "AUTH_ADMIN_REQUIRED_FOR_ROLE_GRANT",
      message:
        "Administrator privileges are required to grant admin roles or modify another user's roles",
    }),

  adminRequiredForRevoke: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "AUTH_ADMIN_REQUIRED_FOR_ROLE_REVOKE",
      message: "Administrator privileges are required to revoke roles",
    }),

  cannotRevokeOwnAdmin: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "AUTH_CANNOT_REVOKE_OWN_ADMIN",
      message: "You cannot revoke your own admin role",
    }),

  targetUserNotFound: (message = "Target user not found") =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "AUTH_TARGET_USER_NOT_FOUND",
      message,
    }),

  roleNotFoundForApp: (appId: string, role: string) =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "AUTH_ROLE_NOT_FOUND",
      message: `Role '${role}' does not exist for app '${appId}'`,
    }),
};
