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

export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  AUTH_API?: Fetcher;
  AUTH_API_URL?: string;
};

export type Variables = {
  user: AuthUser;
  jwtPayload: NiwaJwtPayload;
  authToken: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
