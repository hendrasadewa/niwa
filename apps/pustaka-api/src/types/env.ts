import type { Database } from "../db";
import type { AuthUser, NiwaJwtPayload } from "./auth";

export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  AUTH_API?: Fetcher;
  AUTH_API_URL?: string;
};

export type Variables = {
  db: Database;
  user: AuthUser;
  jwtPayload: NiwaJwtPayload;
  authToken: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
