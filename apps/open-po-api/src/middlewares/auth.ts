import { createMiddleware } from "hono/factory";
import type { Database } from "../db";
import { AppError } from "@niwa/api-core/errors";
import { AuthErrors } from "../errors/auth";
import { createCustomerProfileRepo } from "../repositories/customer-profiles";
import type { AuthUser, NiwaJwtPayload, RoleName } from "../types/auth";
import type { AppEnv } from "../types/env";
import { OPEN_PO_APP_ID } from "../utils/auth";
import { verifyNiwaToken, type VerifyNiwaTokenOptions } from "../utils/jwt";

async function resolveUserFromToken(
  token: string,
  verifyOptions: VerifyNiwaTokenOptions,
  db: Database
): Promise<{ user: AuthUser; verified: NiwaJwtPayload } | null> {
  const verified = await verifyNiwaToken(token, verifyOptions);

  if (
    !verified ||
    typeof verified.sub !== "string" ||
    typeof verified.email !== "string" ||
    typeof verified.name !== "string"
  ) {
    return null;
  }

  const profileRepo = createCustomerProfileRepo(db);
  const defaultShippingAddress = await profileRepo.findShippingAddress(
    verified.sub
  );

  const openPoRoles = Array.isArray(verified.roles)
    ? (verified.roles as RoleName[])
    : Array.isArray(verified.app_roles?.[OPEN_PO_APP_ID])
      ? (verified.app_roles[OPEN_PO_APP_ID] as RoleName[])
      : [];
  const openPoPermissions = Array.isArray(verified.permissions)
    ? verified.permissions
    : Array.isArray(verified.app_permissions?.[OPEN_PO_APP_ID])
      ? verified.app_permissions[OPEN_PO_APP_ID]
      : [];

  return {
    verified,
    user: {
      id: verified.sub,
      name: verified.name,
      email: verified.email,
      whatsapp_number: verified.whatsapp_number ?? "",
      default_shipping_address: defaultShippingAddress,
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
    throw AuthErrors.missingAuthHeader();
  }

  let resolved: { user: AuthUser; verified: NiwaJwtPayload } | null;
  try {
    resolved = await resolveUserFromToken(
      token,
      {
        authApi: c.env.AUTH_API,
        authApiUrl: c.env.AUTH_API_URL,
        issuer: c.env.JWT_ISSUER,
      },
      c.get("db")
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AuthErrors.invalidOrExpiredJwt();
  }

  if (!resolved) {
    throw AuthErrors.invalidTokenOrUser();
  }

  c.set("jwtPayload", resolved.verified);
  c.set("user", resolved.user);
  c.set("authToken", token);

  await next();
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
            {
              authApi: c.env.AUTH_API,
              authApiUrl: c.env.AUTH_API_URL,
              issuer: c.env.JWT_ISSUER,
            },
            c.get("db")
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
