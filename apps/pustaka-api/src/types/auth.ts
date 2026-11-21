export type RoleName = "admin" | "member";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  created_at?: number;
};

export type NiwaJwtPayload = {
  sub: string;
  email: string;
  name: string;
  whatsapp_number: string;
  app_roles: Record<string, string[]>;
  app_permissions: Record<string, string[]>;
  created_at?: number;
  iat: number;
  exp: number;
};

export type AuthApiUser = {
  id: string;
  email: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  app_roles: Record<string, string[]>;
  app_permissions: Record<string, string[]>;
  created_at: number;
  updated_at: number;
};

export type AuthApiResponsePayload = {
  user?: AuthApiUser;
  users?: AuthApiUser[];
  total?: number;
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  revoked_sessions?: number;
  code?: string;
  error?: string;
  message?: string;
  details?: unknown;
};

export type PustakaAuthTokenResponse = {
  user: AuthUser;
  token: string;
  refresh_token?: string;
  expires_in?: number;
};
