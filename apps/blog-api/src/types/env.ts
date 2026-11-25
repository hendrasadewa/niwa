import type { Database } from "../db";
import type { AuthUser, NiwaJwtPayload } from "./auth";

export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  AUTH_API?: Fetcher;
  AUTH_API_URL?: string;
  JWT_ISSUER?: string;
  ALLOWED_ORIGINS?: string;
  BLOG_PUBLIC_URL?: string;
  BLOG_API_PUBLIC_URL?: string;
  ATPROTO_PDS_URL?: string;
  ATPROTO_OWNER_DID?: string;
  ATPROTO_PUBLICATION_RKEY?: string;
  BSKY_IDENTIFIER?: string;
  BSKY_APP_PASSWORD?: string;
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
