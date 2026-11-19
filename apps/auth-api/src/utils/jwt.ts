import { sign } from "hono/jwt";
import type { AuthUserResponse, NiwaJwtPayload } from "../types";

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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
  jwtSecret: string
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
    exp: now + TOKEN_TTL_SECONDS,
  };

  return sign(payload, jwtSecret, "HS256");
}
