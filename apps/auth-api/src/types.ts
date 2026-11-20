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

export type NiwaJwtPayload = {
  sub: string;
  email: string;
  name: string;
  whatsapp_number: string;
  app_roles: AppRoleMap;
  app_permissions: AppPermissionMap;
  created_at?: number;
  iat: number;
  exp: number;
};

export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_EMAIL?: string;
  ACCESS_TOKEN_TTL_SECONDS?: string;
  REFRESH_TOKEN_TTL_SECONDS?: string;
};

export type Variables = {
  user?: AuthUserResponse;
  jwtPayload?: NiwaJwtPayload;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
