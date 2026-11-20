import { createMiddleware } from "hono/factory";
import type { AppEnv, AuthUserResponse } from "../types";

export function isUserAdmin(
  user: Pick<AuthUserResponse, "app_roles">,
  appId?: string
): boolean {
  if (appId && user.app_roles[appId]?.includes("admin")) {
    return true;
  }
  return Object.values(user.app_roles).some((roleList) =>
    roleList.includes("admin")
  );
}

/**
 * Middleware requiring the authenticated caller to hold an `admin` role.
 */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401
    );
  }

  if (!isUserAdmin(user)) {
    return c.json(
      {
        error: "Forbidden",
        message: "Administrator privileges are required to access this resource",
      },
      403
    );
  }

  await next();
});
