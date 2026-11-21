import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { createDb } from "../db";
import { SsoErrors } from "../errors/sso";
import { createAppRepo } from "../repositories/apps";
import type { AppEnv } from "../types/env";
import { isSecureRequestUrl } from "../utils/cookie";
import { buildAllowedOriginsSet, isOriginAllowed } from "../utils/origin";

export async function isRequestOriginAllowed(
  c: Context<AppEnv>,
  origin: string | undefined
): Promise<boolean> {
  if (!origin) return false;
  const allowLocalhost = !isSecureRequestUrl(c.req.url);

  const staticAllowed = buildAllowedOriginsSet({
    envAllowedOrigins: c.env.ALLOWED_ORIGINS,
    authWebUrl: c.env.AUTH_WEB_URL,
  });

  if (isOriginAllowed(origin, staticAllowed, allowLocalhost)) {
    return true;
  }

  // Fall back to dynamically registered origins stored in D1 `apps.allowed_origins`
  const db = c.get("db") ?? createDb(c.env.DB);
  const registeredOrigins = await createAppRepo(db).listAllAllowedOrigins();
  const dynamicAllowed = buildAllowedOriginsSet({
    registeredOrigins,
    envAllowedOrigins: c.env.ALLOWED_ORIGINS,
    authWebUrl: c.env.AUTH_WEB_URL,
  });

  return isOriginAllowed(origin, dynamicAllowed, allowLocalhost);
}

/**
 * Strict CORS middleware:
 * - `/.well-known/*` is public read-only (`*`, no credentials).
 * - All other routes strictly validate `Origin` against the Niwa allowlist before
 *   emitting `Access-Control-Allow-Credentials: true`.
 */
export const strictCorsMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.path.startsWith("/.well-known/")) {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }
    await next();
    return;
  }

  const origin = c.req.header("Origin");
  if (origin) {
    const allowed = await isRequestOriginAllowed(c, origin);
    if (allowed) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Credentials", "true");
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Niwa-Requested-With"
      );
      c.header("Access-Control-Max-Age", "86400");
      c.header("Vary", "Origin");
    } else if (c.req.method === "OPTIONS") {
      throw SsoErrors.originNotAllowed();
    }
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
});
