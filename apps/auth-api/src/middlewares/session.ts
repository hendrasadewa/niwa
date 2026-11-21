import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { AppError } from "../errors/app-error";
import { AuthErrors } from "../errors/auth";
import { SsoErrors } from "../errors/sso";
import { createIdpSessionRepo } from "../repositories/idp-sessions";
import { createRoleRepo } from "../repositories/roles";
import { createUserRepo } from "../repositories/users";
import type { AuthUserResponse, NiwaJwtPayload } from "../types/auth";
import type { AppEnv } from "../types/env";
import type { IdpSessionInfo } from "../types/sso";
import { parseCookieHeader, resolveSessionCookieName } from "../utils/cookie";
import { verifyNiwaToken } from "../utils/jwt";
import { parseJsonStringArray } from "../utils/origin";
import { hashToken, resolveIdpSessionTtl } from "../utils/token";

const LAST_SEEN_TOUCH_INTERVAL_SECONDS = 300; // 5 minutes

async function resolveIdpSessionFromCookie(
  c: Context<AppEnv>
): Promise<{ session: IdpSessionInfo; user: AuthUserResponse } | null> {
  const cookieName = resolveSessionCookieName(c.req.url);
  const rawToken = parseCookieHeader(c.req.header("Cookie"), cookieName);
  if (!rawToken) return null;

  const sessionHash = await hashToken(rawToken);
  const db = c.get("db");
  const idpSessionRepo = createIdpSessionRepo(db);
  const sessionRow = await idpSessionRepo.findBySessionHash(sessionHash);

  const now = Math.floor(Date.now() / 1000);
  if (
    !sessionRow ||
    sessionRow.revoked_at !== null ||
    sessionRow.expires_at <= now
  ) {
    return null;
  }

  const userRepo = createUserRepo(db);
  const userRecord = await userRepo.findById(sessionRow.user_id);
  if (!userRecord || !userRecord.is_active) {
    return null;
  }

  const roleRepo = createRoleRepo(db);
  const { app_roles, app_permissions } =
    await roleRepo.getUserAppRolesAndPermissions(userRecord.id);

  let lastSeenAt = sessionRow.last_seen_at;
  let expiresAt = sessionRow.expires_at;
  if (now - sessionRow.last_seen_at >= LAST_SEEN_TOUCH_INTERVAL_SECONDS) {
    const ttl = resolveIdpSessionTtl(c.env.IDP_SESSION_TTL_SECONDS);
    lastSeenAt = now;
    expiresAt = now + ttl;
    await idpSessionRepo.touchLastSeen(sessionRow.id, lastSeenAt, expiresAt);
  }

  const sessionInfo: IdpSessionInfo = {
    id: sessionRow.id,
    user_id: sessionRow.user_id,
    amr: parseJsonStringArray(sessionRow.amr),
    ip_address: sessionRow.ip_address,
    user_agent: sessionRow.user_agent,
    last_seen_at: lastSeenAt,
    expires_at: expiresAt,
    created_at: sessionRow.created_at,
  };

  const authUser: AuthUserResponse = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    whatsapp_number: userRecord.whatsapp_number,
    is_active: userRecord.is_active,
    app_roles,
    app_permissions,
    created_at: userRecord.created_at,
    updated_at: userRecord.updated_at,
  };

  return { session: sessionInfo, user: authUser };
}

export const optionalSessionMiddleware = createMiddleware<AppEnv>(
  async (c, next) => {
    const resolved = await resolveIdpSessionFromCookie(c);
    if (resolved) {
      c.set("idpSession", resolved.session);
      c.set("user", resolved.user);
    }
    await next();
  }
);

export const requireSessionMiddleware = createMiddleware<AppEnv>(
  async (c, next) => {
    const resolved = await resolveIdpSessionFromCookie(c);
    if (!resolved) {
      throw SsoErrors.sessionRequired();
    }
    c.set("idpSession", resolved.session);
    c.set("user", resolved.user);
    await next();
  }
);

/**
 * Authenticates via `__Host-niwa_session` cookie first, falling back to
 * `Authorization: Bearer <ES256 JWT>` so Account Portal routes work with both
 * cookie-backed browser sessions and bearer-authenticated tooling.
 */
export const requireSessionOrJwtMiddleware = createMiddleware<AppEnv>(
  async (c, next) => {
    const fromCookie = await resolveIdpSessionFromCookie(c);
    if (fromCookie) {
      c.set("idpSession", fromCookie.session);
      c.set("user", fromCookie.user);
      await next();
      return;
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw SsoErrors.sessionRequired();
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw SsoErrors.sessionRequired();
    }

    let verified: NiwaJwtPayload;
    try {
      verified = await verifyNiwaToken(token, {
        activeKid: c.env.JWT_ACTIVE_KID,
        privateKeyJwk: c.env.JWT_PRIVATE_KEY_JWK,
        extraPublicJwks: c.env.JWT_PUBLIC_JWKS_EXTRA,
        issuer: c.env.JWT_ISSUER,
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AuthErrors.invalidOrExpiredJwt();
    }

    if (!verified || typeof verified.sub !== "string") {
      throw AuthErrors.invalidJwtPayload();
    }

    const db = c.get("db");
    const userRecord = await createUserRepo(db).findById(verified.sub);
    if (!userRecord || !userRecord.is_active) {
      throw AuthErrors.userNotFoundOrInactive();
    }

    const { app_roles, app_permissions } = await createRoleRepo(
      db
    ).getUserAppRolesAndPermissions(userRecord.id);

    c.set("jwtPayload", verified);
    c.set("user", {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      whatsapp_number: userRecord.whatsapp_number,
      is_active: userRecord.is_active,
      app_roles,
      app_permissions,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    });

    await next();
  }
);
