export type AppRoleMap = Record<string, string[]>;
export type AppPermissionMap = Record<string, string[]>;

export type AuthUserResponse = {
  id: string;
  email: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  app_roles: AppRoleMap;
  app_permissions: AppPermissionMap;
  created_at: number;
  updated_at: number;
};

export type UserWithSessionCount = AuthUserResponse & {
  active_sessions_count: number;
};

export type NiwaJwtPayload = {
  iss: string;
  sub: string;
  aud: string | string[];
  sid?: string;
  jti: string;
  email: string;
  email_verified: boolean;
  name: string;
  whatsapp_number: string;
  amr?: string[];
  roles?: string[];
  permissions?: string[];
  app_roles: AppRoleMap;
  app_permissions: AppPermissionMap;
  created_at?: number;
  iat: number;
  exp: number;
};

export type ActiveSessionResponse = {
  id: string;
  family_id: string;
  user_agent: string | null;
  created_at: number;
  expires_at: number;
};

export type AuthTokenResponse = {
  user: AuthUserResponse;
  token: string;
  refresh_token: string;
  expires_in: number;
};
