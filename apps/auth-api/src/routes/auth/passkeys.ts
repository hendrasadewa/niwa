import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { createAppRepo } from "../../repositories/apps";
import { createConsentRepo } from "../../repositories/consents";
import { createIdpSessionRepo } from "../../repositories/idp-sessions";
import { createRoleRepo } from "../../repositories/roles";
import { createUserRepo } from "../../repositories/users";
import { createWebAuthnRepo } from "../../repositories/webauthn";
import { createPasskeyService } from "../../services/passkeys";
import { createSsoService } from "../../services/sso";
import type { AppEnv } from "../../types/env";
import { buildSessionSetCookie } from "../../utils/cookie";
import { resolveAccessTokenTtl, resolveAuthWebUrl } from "../../utils/jwt";
import { resolveIdpSessionTtl } from "../../utils/token";
import { resolveWebAuthnConfig } from "../../utils/webauthn";
import { validate } from "../../validators";
import {
  passkeyLoginOptionsSchema,
  passkeyLoginVerifySchema,
} from "../../validators/auth";

export function getPasskeyService(c: Context<AppEnv>) {
  const db = c.get("db");
  const authWebUrl = resolveAuthWebUrl(c.env.AUTH_WEB_URL);
  return createPasskeyService({
    userRepo: createUserRepo(db),
    roleRepo: createRoleRepo(db),
    webauthnRepo: createWebAuthnRepo(db),
    config: resolveWebAuthnConfig({
      authWebUrl,
      rpId: c.env.WEBAUTHN_RP_ID,
      origin: c.env.WEBAUTHN_ORIGIN,
      rpName: c.env.WEBAUTHN_RP_NAME,
    }),
  });
}

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

export const authPasskeyRoutes = new Hono<AppEnv>();

// POST /api/v1/auth/passkeys/login/options
authPasskeyRoutes.post(
  "/passkeys/login/options",
  validate("json", passkeyLoginOptionsSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    const result = await getPasskeyService(c).startLogin(email);
    return c.json(result);
  }
);

// POST /api/v1/auth/passkeys/login/verify
authPasskeyRoutes.post(
  "/passkeys/login/verify",
  validate("json", passkeyLoginVerifySchema),
  async (c) => {
    const { challenge_id, response } = c.req.valid("json");
    const { user } = await getPasskeyService(c).verifyLogin({
      challengeId: challenge_id,
      response,
    });

    const issuedSession = await getSsoService(c).issueSessionForUser({
      userId: user.id,
      amr: ["webauthn"],
      ipAddress: c.req.header("CF-Connecting-IP") ?? null,
      userAgent: c.req.header("User-Agent"),
    });
    c.header(
      "Set-Cookie",
      buildSessionSetCookie({
        requestUrl: c.req.url,
        value: issuedSession.rawToken,
        maxAgeSeconds: issuedSession.maxAge,
      })
    );

    return c.json({ user });
  }
);
