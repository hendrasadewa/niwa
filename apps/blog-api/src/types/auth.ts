export type RoleName = "admin";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  created_at?: number;
};

export type NiwaJwtPayload = {
  iss?: string;
  sub: string;
  aud?: string | string[];
  sid?: string;
  jti?: string;
  email: string;
  email_verified?: boolean;
  name: string;
  roles?: string[];
  permissions?: string[];
  app_roles?: Record<string, string[]>;
  app_permissions?: Record<string, string[]>;
  created_at?: number;
  iat: number;
  exp: number;
};
