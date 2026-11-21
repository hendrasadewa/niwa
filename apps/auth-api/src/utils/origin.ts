import { DEFAULT_AUTH_WEB_URL } from "./jwt";

export const DEFAULT_ALLOWED_ORIGINS: ReadonlyArray<string> = [
  "https://auth.hendrasadewa.com",
  "https://preorder.hendrasadewa.com",
  "https://pustaka.hendrasadewa.com",
  "https://labs.hendrasadewa.com",
  "https://hendrasadewa.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:5173",
];

const LOCALHOST_ORIGIN_REGEX = /^http:\/\/localhost(?::\d{1,5})?$/;

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

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

export function buildAllowedOriginsSet(params: {
  registeredOrigins?: Iterable<string>;
  envAllowedOrigins?: string;
  authWebUrl?: string;
}): Set<string> {
  const allowed = new Set<string>(DEFAULT_ALLOWED_ORIGINS);

  if (params.authWebUrl) {
    try {
      allowed.add(new URL(params.authWebUrl).origin);
    } catch {
      // Ignore invalid AUTH_WEB_URL
    }
  }

  for (const origin of parseAllowedOriginsEnv(params.envAllowedOrigins)) {
    allowed.add(origin);
  }

  if (params.registeredOrigins) {
    for (const origin of params.registeredOrigins) {
      try {
        allowed.add(new URL(origin).origin);
      } catch {
        // Ignore invalid origin entries
      }
    }
  }

  return allowed;
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

export function isAuthWebOrigin(
  origin: string | undefined,
  authWebUrl?: string
): boolean {
  if (!origin) return false;
  const normalized = origin.trim().replace(/\/+$/, "");
  const allowedPortalOrigins = new Set<string>([
    new URL(DEFAULT_AUTH_WEB_URL).origin,
    "http://localhost:3003",
  ]);
  if (authWebUrl) {
    try {
      allowedPortalOrigins.add(new URL(authWebUrl).origin);
    } catch {
      // Ignore invalid URL
    }
  }
  return allowedPortalOrigins.has(normalized);
}

/**
 * Strictly validates a post-login / post-consent redirect_uri against an app's
 * registered allowed_redirect_uris to prevent open redirects.
 */
export function isValidRedirectUri(
  redirectUri: string,
  allowedRedirectUris: string[]
): boolean {
  if (!redirectUri || redirectUri.startsWith("//")) {
    return false;
  }

  let target: URL;
  try {
    target = new URL(redirectUri);
  } catch {
    return false;
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return false;
  }

  if (target.username || target.password) {
    return false;
  }

  if (target.pathname.startsWith("//")) {
    return false;
  }

  for (const allowedRaw of allowedRedirectUris) {
    let allowed: URL;
    try {
      allowed = new URL(allowedRaw);
    } catch {
      continue;
    }

    if (target.origin !== allowed.origin) {
      continue;
    }

    const allowedPath = allowed.pathname.replace(/\/+$/, "");
    if (!allowedPath || allowedPath === "") {
      return true;
    }

    if (
      target.pathname === allowedPath ||
      target.pathname.startsWith(`${allowedPath}/`)
    ) {
      return true;
    }
  }

  return false;
}
