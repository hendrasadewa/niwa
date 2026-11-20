import { and, eq, isNull } from "drizzle-orm";
import { refreshTokens, type Database } from "../db";

export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const REFRESH_TOKEN_PREFIX = "niwa_rt_";

export function resolveRefreshTokenTtl(envValue?: string): number {
  if (!envValue) return DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed < 300) {
    return DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
  }
  return parsed;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateRawRefreshToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return `${REFRESH_TOKEN_PREFIX}${bytesToBase64Url(randomBytes)}`;
}

export async function hashRefreshToken(rawToken: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

export async function issueRefreshToken(
  db: Database,
  params: {
    userId: string;
    familyId?: string;
    userAgent?: string | null;
    ttlSeconds?: number;
  }
): Promise<{
  id: string;
  familyId: string;
  rawToken: string;
  expiresAt: number;
}> {
  const id = crypto.randomUUID();
  const familyId = params.familyId ?? crypto.randomUUID();
  const rawToken = generateRawRefreshToken();
  const tokenHash = await hashRefreshToken(rawToken);
  const now = Math.floor(Date.now() / 1000);
  const ttl = params.ttlSeconds ?? DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
  const expiresAt = now + ttl;

  await db.insert(refreshTokens).values({
    id,
    user_id: params.userId,
    family_id: familyId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    revoked_at: null,
    replaced_by_id: null,
    user_agent: params.userAgent ? params.userAgent.slice(0, 255) : null,
    created_at: now,
  });

  return { id, familyId, rawToken, expiresAt };
}

export type RotateRefreshTokenResult =
  | {
      ok: true;
      userId: string;
      familyId: string;
      newRefreshToken: string;
      newExpiresAt: number;
    }
  | {
      ok: false;
      reason: "invalid" | "reused" | "expired";
      message: string;
    };

/**
 * Validates and rotates an opaque refresh token.
 * If an already-revoked token is presented (reuse attack), the entire session family is revoked.
 */
export async function rotateRefreshToken(
  db: Database,
  rawToken: string,
  options?: { userAgent?: string | null; ttlSeconds?: number }
): Promise<RotateRefreshTokenResult> {
  const tokenHash = await hashRefreshToken(rawToken);
  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token_hash, tokenHash))
    .limit(1);

  if (!existing) {
    return {
      ok: false,
      reason: "invalid",
      message: "Invalid refresh token",
    };
  }

  const now = Math.floor(Date.now() / 1000);

  if (existing.revoked_at !== null) {
    // Reuse detected — revoke all tokens in the same family
    await db
      .update(refreshTokens)
      .set({ revoked_at: now })
      .where(
        and(
          eq(refreshTokens.family_id, existing.family_id),
          isNull(refreshTokens.revoked_at)
        )
      );

    return {
      ok: false,
      reason: "reused",
      message: "Refresh token reuse detected; session has been revoked",
    };
  }

  if (existing.expires_at <= now) {
    await db
      .update(refreshTokens)
      .set({ revoked_at: now })
      .where(eq(refreshTokens.id, existing.id));

    return {
      ok: false,
      reason: "expired",
      message: "Refresh token has expired",
    };
  }

  const issued = await issueRefreshToken(db, {
    userId: existing.user_id,
    familyId: existing.family_id,
    userAgent: options?.userAgent ?? existing.user_agent,
    ttlSeconds: options?.ttlSeconds,
  });

  await db
    .update(refreshTokens)
    .set({
      revoked_at: now,
      replaced_by_id: issued.id,
    })
    .where(eq(refreshTokens.id, existing.id));

  return {
    ok: true,
    userId: existing.user_id,
    familyId: existing.family_id,
    newRefreshToken: issued.rawToken,
    newExpiresAt: issued.expiresAt,
  };
}

/**
 * Revokes a refresh token and its entire session family.
 */
export async function revokeRefreshTokenByRaw(
  db: Database,
  rawToken: string
): Promise<boolean> {
  const tokenHash = await hashRefreshToken(rawToken);
  const [existing] = await db
    .select({
      id: refreshTokens.id,
      family_id: refreshTokens.family_id,
    })
    .from(refreshTokens)
    .where(eq(refreshTokens.token_hash, tokenHash))
    .limit(1);

  if (!existing) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  await db
    .update(refreshTokens)
    .set({ revoked_at: now })
    .where(
      and(
        eq(refreshTokens.family_id, existing.family_id),
        isNull(refreshTokens.revoked_at)
      )
    );

  return true;
}

/**
 * Revokes all active refresh tokens belonging to a user.
 */
export async function revokeAllUserRefreshTokens(
  db: Database,
  userId: string
): Promise<number> {
  const activeTokens = await db
    .select({ id: refreshTokens.id })
    .from(refreshTokens)
    .where(
      and(eq(refreshTokens.user_id, userId), isNull(refreshTokens.revoked_at))
    );

  if (activeTokens.length === 0) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  await db
    .update(refreshTokens)
    .set({ revoked_at: now })
    .where(
      and(eq(refreshTokens.user_id, userId), isNull(refreshTokens.revoked_at))
    );

  return activeTokens.length;
}
