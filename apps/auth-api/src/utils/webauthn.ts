export const WEBAUTHN_CHALLENGE_TTL_SECONDS = 60 * 5; // 5 minutes
export const DEFAULT_WEBAUTHN_RP_NAME = "Niwa";

export type ResolvedWebAuthnConfig = {
  rpID: string;
  rpName: string;
  expectedOrigin: string;
};

export function resolveWebAuthnConfig(input: {
  authWebUrl: string;
  rpId?: string;
  origin?: string;
  rpName?: string;
}): ResolvedWebAuthnConfig {
  const parsed = new URL(input.authWebUrl);
  return {
    rpID: input.rpId?.trim() || parsed.hostname,
    rpName: input.rpName?.trim() || DEFAULT_WEBAUTHN_RP_NAME,
    expectedOrigin: input.origin?.trim() || parsed.origin,
  };
}

export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlToUint8Array(
  base64Url: string
): Uint8Array<ArrayBuffer> {
  const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
