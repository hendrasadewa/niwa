import { AppError } from "@niwa/api-core/errors";

export const AuthErrors = {
  missingAuthHeader: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_MISSING_TOKEN",
      message: "Missing or invalid Authorization header",
    }),

  missingBearerToken: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_MISSING_BEARER_TOKEN",
      message: "Missing bearer token",
    }),

  invalidTokenPayload: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_INVALID_TOKEN_PAYLOAD",
      message: "Invalid token payload",
    }),

  invalidOrExpiredJwt: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_INVALID_OR_EXPIRED_TOKEN",
      message: "Invalid or expired JWT token",
    }),

  insufficientRole: (allowedRoles: string[]) =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "AUTH_INSUFFICIENT_ROLE",
      message: `Insufficient role privileges. Required: ${allowedRoles.join(" or ")}`,
    }),

  missingPermissions: (requiredPermissions: string[]) =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "AUTH_MISSING_PERMISSIONS",
      message: `Missing required permission(s): ${requiredPermissions.join(", ")}`,
    }),
};
