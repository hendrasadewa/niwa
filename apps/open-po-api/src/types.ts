export type RoleName = "admin" | "seller" | "member";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string;
  default_shipping_address: string | null;
  roles: RoleName[];
  permissions: string[];
};

export type JwtUserPayload = {
  sub: string;
  name: string;
  email: string;
  roles: RoleName[];
  iat: number;
  exp: number;
};

export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  ADMIN_EMAIL?: string;
};

export type Variables = {
  user?: AuthUser;
  jwtPayload?: JwtUserPayload;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
