import { createMiddleware } from "hono/factory";
import { AuthErrors } from "../errors/auth";
import { CommonErrors } from "../errors/common";
import type { AppEnv } from "../types/env";
import { isUserAdmin } from "../utils/rbac";

/**
 * Middleware requiring the authenticated caller to hold an `admin` role.
 */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    throw CommonErrors.unauthorized();
  }

  if (!isUserAdmin(user)) {
    throw AuthErrors.adminRequired();
  }

  await next();
});
