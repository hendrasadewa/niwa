import { sign, verify } from "hono/jwt";
import type { AuthUserResponse, NiwaJwtPayload } from "../types/auth";

export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes

export function resolveAccessTokenTtl(envValue?: string): number {
  if (!envValue) return DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed < 60) {
    return DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  }
  return parsed;
}

export async function signNiwaToken(
  user: Pick<
    AuthUserResponse,
    | "id"
    | "email"
    | "name"
    | "whatsapp_number"
    | "app_roles"
    | "app_permissions"
    | "created_at"
  >,
  jwtSecret: string,
  ttlSeconds = DEFAULT_ACCESS_TOKEN_TTL_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: NiwaJwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    whatsapp_number: user.whatsapp_number,
    app_roles: user.app_roles,
    app_permissions: user.app_permissions,
    created_at: user.created_at,
    iat: now,
    exp: now + ttlSeconds,
  };

  return sign(payload, jwtSecret, "HS256");
}

export async function verifyNiwaToken(
  token: string,
  jwtSecret: string
): Promise<NiwaJwtPayload> {
  return (await verify(token, jwtSecret, "HS256")) as unknown as NiwaJwtPayload;
}
