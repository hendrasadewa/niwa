import type { ErrorHandler, NotFoundHandler } from "hono";
import type { AppEnv } from "../types/env";
import { AppError } from "./app-error";

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.error,
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      err.status
    );
  }

  console.error("[UnhandledError]", err);
  return c.json(
    {
      error: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
    500
  );
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(
    {
      error: "NotFound",
      code: "ROUTE_NOT_FOUND",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
