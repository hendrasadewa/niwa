import type { AuthApiUser, AuthUser, RoleName } from "../types/auth";

export const PUSTAKA_APP_ID = "pustaka";

export function mapAuthApiUserToPustakaUser(authUser: AuthApiUser): AuthUser {
  return {
    id: authUser.id,
    username: authUser.name,
    email: authUser.email,
    roles: (authUser.app_roles?.[PUSTAKA_APP_ID] ?? []) as RoleName[],
    permissions: authUser.app_permissions?.[PUSTAKA_APP_ID] ?? [],
    created_at: authUser.created_at,
  };
}
