import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { authMiddleware } from "../../middlewares/auth";
import { createAppRepo } from "../../repositories/apps";
import { createConsentRepo } from "../../repositories/consents";
import { createIdpSessionRepo } from "../../repositories/idp-sessions";
import { createRefreshTokenRepo } from "../../repositories/refresh-tokens";
import { createRoleRepo } from "../../repositories/roles";
import { createUserRepo } from "../../repositories/users";
import { createAuthService } from "../../services/auth";
import { createSsoService } from "../../services/sso";
import type { AppEnv } from "../../types/env";
import { buildSessionSetCookie } from "../../utils/cookie";
import { resolveAccessTokenTtl, resolveAuthWebUrl } from "../../utils/jwt";
import {
  resolveIdpSessionTtl,
  resolveRefreshTokenTtl,
} from "../../utils/token";
import { validate } from "../../validators";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
} from "../../validators/auth";
import { getEmailVerificationService } from "./email";

function getJwtSigningConfig(c: Context<AppEnv>) {
  return {
    activeKid: c.env.JWT_ACTIVE_KID,
    privateKeyJwk: c.env.JWT_PRIVATE_KEY_JWK,
    extraPublicJwks: c.env.JWT_PUBLIC_JWKS_EXTRA,
    issuer: c.env.JWT_ISSUER,
  };
}

function getAuthService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createAuthService({
    userRepo: createUserRepo(db),
    roleRepo: createRoleRepo(db),
    refreshTokenRepo: createRefreshTokenRepo(db),
    ensureSeeded: () => ensureRbacSeeded(db),
    config: {
      jwtSigning: getJwtSigningConfig(c),
      adminEmail: c.env.ADMIN_EMAIL,
      accessTokenTtl: resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS),
      refreshTokenTtl: resolveRefreshTokenTtl(c.env.REFRESH_TOKEN_TTL_SECONDS),
    },
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
      jwtSigning: getJwtSigningConfig(c),
      accessTokenTtl: resolveAccessTokenTtl(c.env.ACCESS_TOKEN_TTL_SECONDS),
      idpSessionTtl: resolveIdpSessionTtl(c.env.IDP_SESSION_TTL_SECONDS),
      authWebUrl: resolveAuthWebUrl(c.env.AUTH_WEB_URL),
    },
  });
}

export const authCoreRoutes = new Hono<AppEnv>();

// POST /api/v1/auth/register
authCoreRoutes.post("/register", validate("json", registerSchema), async (c) => {
  const body = c.req.valid("json");
  const userAgent = c.req.header("User-Agent");
  const result = await getAuthService(c).register({
    ...body,
    userAgent,
  });

  const issuedSession = await getSsoService(c).issueSessionForUser({
    userId: result.user.id,
    amr: ["pwd"],
    ipAddress: c.req.header("CF-Connecting-IP") ?? null,
    userAgent,
  });
  c.header(
    "Set-Cookie",
    buildSessionSetCookie({
      requestUrl: c.req.url,
      value: issuedSession.rawToken,
      maxAgeSeconds: issuedSession.maxAge,
    })
  );

  // Best-effort verification email on registration (user can also resend from /account)
  try {
    await getEmailVerificationService(c).sendVerificationEmail({
      userId: result.user.id,
      enforceCooldown: false,
    });
  } catch (err) {
    console.error("[niwa-auth:register-verification-email-failed]", err);
  }

  return c.json(result, 201);
});

// POST /api/v1/auth/login
authCoreRoutes.post("/login", validate("json", loginSchema), async (c) => {
  const body = c.req.valid("json");
  const userAgent = c.req.header("User-Agent");
  const result = await getAuthService(c).login({
    ...body,
    userAgent,
  });

  const issuedSession = await getSsoService(c).issueSessionForUser({
    userId: result.user.id,
    amr: ["pwd"],
    ipAddress: c.req.header("CF-Connecting-IP") ?? null,
    userAgent,
  });
  c.header(
    "Set-Cookie",
    buildSessionSetCookie({
      requestUrl: c.req.url,
      value: issuedSession.rawToken,
      maxAgeSeconds: issuedSession.maxAge,
    })
  );

  return c.json(result);
});

// POST /api/v1/auth/refresh
authCoreRoutes.post(
  "/refresh",
  validate("json", refreshTokenSchema),
  async (c) => {
    const { refresh_token } = c.req.valid("json");
    const result = await getAuthService(c).refresh({
      refreshToken: refresh_token,
      userAgent: c.req.header("User-Agent"),
    });
    return c.json(result);
  }
);

// POST /api/v1/auth/logout
authCoreRoutes.post("/logout", validate("json", logoutSchema), async (c) => {
  const { refresh_token } = c.req.valid("json");
  await getAuthService(c).logout(refresh_token);
  return c.json({ message: "Logged out successfully" });
});

// POST /api/v1/auth/logout-all
authCoreRoutes.post("/logout-all", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const revokedCount = await getAuthService(c).logoutAll(user.id);
  return c.json({
    message: "Logged out from all sessions",
    revoked_sessions: revokedCount,
  });
});

// GET /api/v1/auth/sessions
authCoreRoutes.get("/sessions", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const sessions = await getAuthService(c).listSessions(user.id);
  return c.json({ sessions });
});

// PUT /api/v1/auth/password
authCoreRoutes.put(
  "/password",
  authMiddleware,
  validate("json", changePasswordSchema),
  async (c) => {
    const currentUser = c.get("user")!;
    const { current_password, new_password, revoke_other_sessions } =
      c.req.valid("json");
    const result = await getAuthService(c).changePassword({
      currentUser,
      currentPassword: current_password,
      newPassword: new_password,
      revokeOtherSessions: revoke_other_sessions,
      userAgent: c.req.header("User-Agent"),
    });
    return c.json({
      message: "Password updated successfully",
      ...result,
    });
  }
);
