export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const DEFAULT_IDP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const EMAIL_VERIFY_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 60 * 30; // 30 minutes
export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60; // 1 minute

const REFRESH_TOKEN_PREFIX = "niwa_rt_";
const IDP_SESSION_PREFIX = "niwa_sid_";
const EMAIL_VERIFY_PREFIX = "niwa_ev_";
const PASSWORD_RESET_PREFIX = "niwa_pr_";

export function resolveRefreshTokenTtl(envValue?: string): number {
  if (!envValue) return DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed < 300) {
    return DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
  }
  return parsed;
}

export function resolveIdpSessionTtl(envValue?: string): number {
  if (!envValue) return DEFAULT_IDP_SESSION_TTL_SECONDS;
  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed < 300) {
    return DEFAULT_IDP_SESSION_TTL_SECONDS;
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

export function generateRawSessionToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return `${IDP_SESSION_PREFIX}${bytesToBase64Url(randomBytes)}`;
}

export function generateRawVerificationToken(
  purpose: "email_verify" | "password_reset"
): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const prefix =
    purpose === "email_verify" ? EMAIL_VERIFY_PREFIX : PASSWORD_RESET_PREFIX;
  return `${prefix}${bytesToBase64Url(randomBytes)}`;
}

export async function hashToken(rawToken: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

export async function hashRefreshToken(rawToken: string): Promise<string> {
  return hashToken(rawToken);
}
