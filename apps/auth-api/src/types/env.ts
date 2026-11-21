import type { Database } from "../db";
import type { AuthUserResponse, NiwaJwtPayload } from "./auth";
import type { IdpSessionInfo } from "./sso";

export type Bindings = {
  DB: D1Database;
  JWT_ACTIVE_KID?: string;
  JWT_PRIVATE_KEY_JWK: string;
  JWT_PUBLIC_JWKS_EXTRA?: string;
  JWT_ISSUER?: string;
  AUTH_WEB_URL?: string;
  ALLOWED_ORIGINS?: string;
  ADMIN_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  WEBAUTHN_RP_ID?: string;
  WEBAUTHN_ORIGIN?: string;
  WEBAUTHN_RP_NAME?: string;
  ACCESS_TOKEN_TTL_SECONDS?: string;
  REFRESH_TOKEN_TTL_SECONDS?: string;
  IDP_SESSION_TTL_SECONDS?: string;
};

export type Variables = {
  db: Database;
  user?: AuthUserResponse;
  jwtPayload?: NiwaJwtPayload;
  idpSession?: IdpSessionInfo;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
