import type { Database } from "../db";
import type { AuthUserResponse, NiwaJwtPayload } from "./auth";

export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_EMAIL?: string;
  ACCESS_TOKEN_TTL_SECONDS?: string;
  REFRESH_TOKEN_TTL_SECONDS?: string;
};

export type Variables = {
  db: Database;
  user?: AuthUserResponse;
  jwtPayload?: NiwaJwtPayload;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
