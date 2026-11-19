export type RoleName = "admin" | "seller" | "member";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string;
  default_shipping_address: string | null;
  roles: RoleName[];
  permissions: string[];
  created_at: number;
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
  user?: AuthUser;
  jwtPayload?: NiwaJwtPayload;
  authToken?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
