import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { createDb, users } from "../db";
import { getUserRolesAndPermissions } from "../db/rbac";
import type { AppEnv, AuthUser, JwtUserPayload } from "../types";

async function resolveUserFromToken(
  token: string,
  jwtSecret: string,
  d1: D1Database
): Promise<{ user: AuthUser; verified: JwtUserPayload } | null> {
  const verified = (await verify(
    token,
    jwtSecret,
    "HS256"
  )) as unknown as JwtUserPayload;

  if (!verified || typeof verified.sub !== "string") {
    return null;
  }

  const db = createDb(d1);
  const [userRecord] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      whatsapp_number: users.whatsapp_number,
      default_shipping_address: users.default_shipping_address,
    })
    .from(users)
    .where(eq(users.id, verified.sub))
    .limit(1);

  if (!userRecord) {
    return null;
  }

  const { roles, permissions } = await getUserRolesAndPermissions(
    db,
    userRecord.id
  );

  return {
    verified,
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      whatsapp_number: userRecord.whatsapp_number,
      default_shipping_address: userRecord.default_shipping_address,
      roles,
      permissions,
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
          }
        } catch {
          // Ignore invalid optional token and treat as Guest
        }
      }
    }
    await next();
  }
);
