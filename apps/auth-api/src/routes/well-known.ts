import { Hono } from "hono";
import type { AppEnv } from "../types/env";
import {
  buildPublicJwks,
  resolveAuthWebUrl,
  resolveJwtIssuer,
} from "../utils/jwt";

export const wellKnownRoutes = new Hono<AppEnv>();

// GET /.well-known/jwks.json
wellKnownRoutes.get("/jwks.json", async (c) => {
  const jwks = await buildPublicJwks({
    activeKid: c.env.JWT_ACTIVE_KID,
    privateKeyJwk: c.env.JWT_PRIVATE_KEY_JWK,
    extraPublicJwks: c.env.JWT_PUBLIC_JWKS_EXTRA,
    issuer: c.env.JWT_ISSUER,
  });

  c.header("Cache-Control", "public, max-age=3600");
  return c.json(jwks);
});

// GET /.well-known/openid-configuration
wellKnownRoutes.get("/openid-configuration", (c) => {
  const issuer = resolveJwtIssuer(c.env.JWT_ISSUER);
  const authWebUrl = resolveAuthWebUrl(c.env.AUTH_WEB_URL);

  c.header("Cache-Control", "public, max-age=3600");
  return c.json({
    issuer,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    authorization_endpoint: `${authWebUrl}/login`,
    consent_endpoint: `${authWebUrl}/consent`,
    token_endpoint: `${issuer}/api/v1/sso/token`,
    end_session_endpoint: `${issuer}/api/v1/sso/logout`,
    id_token_signing_alg_values_supported: ["ES256"],
    response_types_supported: ["token"],
    subject_types_supported: ["public"],
  });
});
