import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { csrfGuard, requireAuthWebOrigin } from "../../middlewares/csrf";
import {
  optionalSessionMiddleware,
  requireSessionMiddleware,
} from "../../middlewares/session";
import { createAppRepo } from "../../repositories/apps";
import { createConsentRepo } from "../../repositories/consents";
import { createIdpSessionRepo } from "../../repositories/idp-sessions";
import { createRoleRepo } from "../../repositories/roles";
import { createSsoService } from "../../services/sso";
import type { AppEnv } from "../../types/env";
import { buildClearSessionCookie } from "../../utils/cookie";
import { resolveAccessTokenTtl, resolveAuthWebUrl } from "../../utils/jwt";
import { resolveIdpSessionTtl } from "../../utils/token";
import { validate } from "../../validators";
import { ssoConsentSchema, ssoTokenSchema } from "../../validators/sso";

function getSsoService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createSsoService({
    appRepo: createAppRepo(db),
    roleRepo: createRoleRepo(db),
    idpSessionRepo: createIdpSessionRepo(db),
    consentRepo: createConsentRepo(db),
    ensureSeeded: () => ensureRbacSeeded(db),
    config: {
      jwtSigning: {
        activeKid: c.env.JWT_ACTIVE_KID,
        privateKeyJwk: c.env.JWT_PRIVATE_KEY_JWK,
        extraPublicJwks: c.env.JWT_PUBLIC_JWKS_EXTRA,
        issuer: c.env.JWT_ISSUER,
      },
      accessTokenTtl: resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS),
      idpSessionTtl: resolveIdpSessionTtl(c.env.IDP_SESSION_TTL_SECONDS),
      authWebUrl: resolveAuthWebUrl(c.env.AUTH_WEB_URL),
    },
  });
}

export const ssoRoutes = new Hono<AppEnv>();

// All SSO endpoints are cookie-authenticated POST routes protected by CSRF guard
ssoRoutes.use("*", csrfGuard);

// POST /api/v1/sso/token
ssoRoutes.post(
  "/token",
  optionalSessionMiddleware,
  validate("json", ssoTokenSchema),
  async (c) => {
    const { app_id, redirect_uri } = c.req.valid("json");
    const result = await getSsoService(c).exchangeToken({
      session: c.get("idpSession"),
      user: c.get("user"),
      appId: app_id,
      redirectUri: redirect_uri,
    });
    return c.json(result);
  }
);

// POST /api/v1/sso/consent
ssoRoutes.post(
  "/consent",
  requireAuthWebOrigin,
  requireSessionMiddleware,
  validate("json", ssoConsentSchema),
  async (c) => {
    const user = c.get("user")!;
    const { app_id, decision, redirect_uri } = c.req.valid("json");
    const result = await getSsoService(c).submitConsent({
      user,
      appId: app_id,
      decision,
      redirectUri: redirect_uri,
    });
    return c.json(result);
  }
);

// POST /api/v1/sso/logout
ssoRoutes.post("/logout", optionalSessionMiddleware, async (c) => {
  const session = c.get("idpSession");
  await getSsoService(c).logoutSession(session?.id);
  c.header("Set-Cookie", buildClearSessionCookie(c.req.url));
  return c.json({ message: "Logged out successfully" });
});
