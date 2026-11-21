export const PROD_SESSION_COOKIE_NAME = "__Host-niwa_session";
export const DEV_SESSION_COOKIE_NAME = "niwa_session";

export function isSecureRequestUrl(requestUrl: string): boolean {
  try {
    return new URL(requestUrl).protocol === "https:";
  } catch {
    return true;
  }
}

export function resolveSessionCookieName(requestUrl: string): string {
  return isSecureRequestUrl(requestUrl)
    ? PROD_SESSION_COOKIE_NAME
    : DEV_SESSION_COOKIE_NAME;
}

export function parseCookieHeader(
  cookieHeader: string | undefined,
  name: string
): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    if (key !== name) continue;
    const rawValue = pair.slice(eqIndex + 1).trim();
    if (!rawValue) return null;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return null;
}

export function buildSessionSetCookie(params: {
  requestUrl: string;
  value: string;
  maxAgeSeconds: number;
}): string {
  const secure = isSecureRequestUrl(params.requestUrl);
  const name = secure ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME;
  const parts = [
    `${name}=${encodeURIComponent(params.value)}`,
    `Max-Age=${Math.max(0, Math.floor(params.maxAgeSeconds))}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function buildClearSessionCookie(requestUrl: string): string {
  const secure = isSecureRequestUrl(requestUrl);
  const name = secure ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME;
  const parts = [
    `${name}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
