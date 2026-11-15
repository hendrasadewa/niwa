export type RoleName = "admin" | "member";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
};

export type JwtUserPayload = {
  sub: string;
  username: string;
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
  user: AuthUser;
  jwtPayload: JwtUserPayload;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
