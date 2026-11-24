import { AppError } from "./app-error";

export const CommonErrors = {
  validation: (details: unknown, message = "Invalid request payload") =>
    new AppError({
      status: 400,
      error: "Validation Error",
      code: "VALIDATION_ERROR",
      message,
      details,
    }),

  badRequest: (message: string, code = "BAD_REQUEST") =>
    new AppError({ status: 400, error: "BadRequest", code, message }),

  unauthorized: (message = "Authentication required", code = "UNAUTHORIZED") =>
    new AppError({ status: 401, error: "Unauthorized", code, message }),

  forbidden: (message = "Insufficient permissions", code = "FORBIDDEN") =>
    new AppError({ status: 403, error: "Forbidden", code, message }),

  notFound: (message = "Resource not found", code = "NOT_FOUND") =>
    new AppError({ status: 404, error: "NotFound", code, message }),

  conflict: (message: string, code = "CONFLICT") =>
    new AppError({ status: 409, error: "Conflict", code, message }),
};
