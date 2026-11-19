import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { createDb, customerProfiles } from "../db";
import type { AppEnv, AuthUser, NiwaJwtPayload, RoleName } from "../types";
import { OPEN_PO_APP_ID } from "../utils/auth-client";

async function resolveUserFromToken(
  token: string,
  jwtSecret: string,
  d1: D1Database
): Promise<{ user: AuthUser; verified: NiwaJwtPayload } | null> {
  const verified = (await verify(
    token,
    jwtSecret,
    "HS256"
  )) as unknown as NiwaJwtPayload;

  if (
    !verified ||
    typeof verified.sub !== "string" ||
    typeof verified.email !== "string" ||
    typeof verified.name !== "string"
  ) {
    return null;
  }

  const db = createDb(d1);
  const [profile] = await db
    .select({
      default_shipping_address: customerProfiles.default_shipping_address,
    })
    .from(customerProfiles)
    .where(eq(customerProfiles.user_id, verified.sub))
    .limit(1);

  const openPoRoles = Array.isArray(verified.app_roles?.[OPEN_PO_APP_ID])
    ? (verified.app_roles[OPEN_PO_APP_ID] as RoleName[])
    : [];
  const openPoPermissions = Array.isArray(
    verified.app_permissions?.[OPEN_PO_APP_ID]
  )
    ? verified.app_permissions[OPEN_PO_APP_ID]
    : [];

  return {
    verified,
    user: {
      id: verified.sub,
      name: verified.name,
      email: verified.email,
      whatsapp_number: verified.whatsapp_number ?? "",
      default_shipping_address: profile?.default_shipping_address ?? null,
      roles: openPoRoles,
      permissions: openPoPermissions,
      created_at: verified.created_at ?? verified.iat,
    },
  };
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");

  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  } else if (queryToken) {
    token = queryToken.trim();
  }

  if (!token) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      },
      401
    );
  }

  try {
    const resolved = await resolveUserFromToken(
      token,
      c.env.JWT_SECRET,
      c.env.DB
    );
    if (!resolved) {
      return c.json(
        { error: "Unauthorized", message: "Invalid token or user not found" },
        401
      );
    }

    c.set("jwtPayload", resolved.verified);
    c.set("user", resolved.user);
    c.set("authToken", token);

    await next();
  } catch {
    return c.json(
      { error: "Unauthorized", message: "Invalid or expired JWT token" },
      401
    );
  }
});

/**
 * Optional authentication middleware for hybrid Guest / Member endpoints.
 * Populates `c.get("user")` if a valid Bearer token is provided; otherwise continues as Guest.
 */
export const optionalAuthMiddleware = createMiddleware<AppEnv>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      if (token) {
        try {
          const resolved = await resolveUserFromToken(
            token,
            c.env.JWT_SECRET,
            c.env.DB
          );
          if (resolved) {
            c.set("jwtPayload", resolved.verified);
            c.set("user", resolved.user);
            c.set("authToken", token);
          }
        } catch {
          // Ignore invalid optional token and treat as Guest
        }
      }
    }
    await next();
  }
);
