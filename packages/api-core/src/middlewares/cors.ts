import type { Context, Env } from "hono";
import { createMiddleware } from "hono/factory";

const LOCALHOST_ORIGIN_REGEX = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;

export function isSecureRequestUrl(requestUrl: string): boolean {
  try {
    return new URL(requestUrl).protocol === "https:";
  } catch {
    return true;
  }
}

export function isLocalhostOrigin(origin: string): boolean {
  return LOCALHOST_ORIGIN_REGEX.test(origin);
}

export function parseAllowedOriginsEnv(envValue?: string): string[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedSet: Set<string>,
  allowLocalhost = false
): boolean {
  if (!origin) return false;
  const normalized = origin.trim().replace(/\/+$/, "");
  if (allowedSet.has(normalized)) return true;
  if (allowLocalhost && isLocalhostOrigin(normalized)) return true;
  return false;
}

export type CorsEnv = Env & {
  Bindings: {
    ALLOWED_ORIGINS?: string;
  };
};

export type OriginCorsOptions<TEnv extends Env = CorsEnv> = {
  /** Static production/default origins always allowed in addition to `ALLOWED_ORIGINS` env. */
  defaultAllowedOrigins?: ReadonlyArray<string>;
  /** Emit `Access-Control-Allow-Credentials: true` for allowed origins. Default: `false`. */
  allowCredentials?: boolean;
  /** Path prefixes served as public read-only (`Access-Control-Allow-Origin: *`, GET/OPTIONS). */
  publicReadPaths?: ReadonlyArray<string>;
  /** Allowed HTTP methods. Default: `"GET, POST, PUT, PATCH, DELETE, OPTIONS"`. */
  allowMethods?: string;
  /** Allowed request headers. Default: `"Content-Type, Authorization"`. */
  allowHeaders?: string;
  /** Preflight cache max-age in seconds. Default: `86400`. */
  maxAge?: number;
  /** Optional custom async origin validator (e.g. dynamic D1 allowlist lookup). */
  isAllowed?: (c: Context<TEnv>, origin: string) => boolean | Promise<boolean>;
  /** Optional hook called when an `OPTIONS` preflight arrives from a disallowed origin. */
  onOriginRejected?: (c: Context<TEnv>, origin: string) => never;
};

export function createOriginCorsMiddleware<TEnv extends Env = CorsEnv>(
  options: OriginCorsOptions<TEnv> = {}
) {
  const {
    defaultAllowedOrigins = [],
    allowCredentials = false,
    publicReadPaths = [],
    allowMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    allowHeaders = "Content-Type, Authorization",
    maxAge = 86400,
    isAllowed,
    onOriginRejected,
  } = options;

  return createMiddleware<TEnv>(async (c, next) => {
    if (publicReadPaths.some((prefix) => c.req.path.startsWith(prefix))) {
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
      let allowed = false;
      if (isAllowed) {
        allowed = await isAllowed(c, origin);
      } else {
        const allowLocalhost = !isSecureRequestUrl(c.req.url);
        const envBindings = c.env as { ALLOWED_ORIGINS?: string } | undefined;
        const allowedSet = new Set<string>([
          ...defaultAllowedOrigins.map((o) => o.trim().replace(/\/+$/, "")),
          ...parseAllowedOriginsEnv(envBindings?.ALLOWED_ORIGINS),
        ]);
        allowed = isOriginAllowed(origin, allowedSet, allowLocalhost);
      }

      if (allowed) {
        c.header("Access-Control-Allow-Origin", origin);
        if (allowCredentials) {
          c.header("Access-Control-Allow-Credentials", "true");
        }
        c.header("Access-Control-Allow-Methods", allowMethods);
        c.header("Access-Control-Allow-Headers", allowHeaders);
        c.header("Access-Control-Max-Age", String(maxAge));
        c.header("Vary", "Origin");
      } else if (c.req.method === "OPTIONS" && onOriginRejected) {
        onOriginRejected(c, origin);
      }
    }

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  });
}
