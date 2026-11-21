import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "./app-error";

export const AuthErrors = {
  missingAuthHeader: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_MISSING_TOKEN",
      message: "Missing or invalid Authorization header",
    }),

  invalidTokenOrUser: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "AUTH_INVALID_TOKEN_PAYLOAD",
      message: "Invalid token or user not found",
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

  serviceUnreachable: () =>
    new AppError({
      status: 502,
      error: "BadGateway",
      code: "AUTH_SERVICE_UNREACHABLE",
      message: "Unable to reach authentication service",
    }),

  upstream: (opts: {
    status: number;
    error?: string;
    code?: string;
    message: string;
    details?: unknown;
  }) =>
    new AppError({
      status: opts.status as ContentfulStatusCode,
      error: opts.error ?? "AuthError",
      code: opts.code ?? "AUTH_UPSTREAM_ERROR",
      message: opts.message,
      details: opts.details,
    }),
};
