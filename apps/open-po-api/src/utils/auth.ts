import type { AuthApiUser, AuthUser, RoleName } from "../types/auth";

export const OPEN_PO_APP_ID = "open-po";

export function mapAuthApiUserToOpenPoUser(
  authUser: AuthApiUser,
  defaultShippingAddress: string | null
): AuthUser {
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    whatsapp_number: authUser.whatsapp_number,
    default_shipping_address: defaultShippingAddress,
    roles: (authUser.app_roles?.[OPEN_PO_APP_ID] ?? []) as RoleName[],
    permissions: authUser.app_permissions?.[OPEN_PO_APP_ID] ?? [],
    created_at: authUser.created_at,
  };
}
