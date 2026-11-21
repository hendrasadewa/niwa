import type { AuthUserResponse } from "../types/auth";

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
