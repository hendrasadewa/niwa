export const OPEN_PO_APP_ID = "open-po";

export const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8788";

export const AUTH_WEB_URL =
  process.env.NEXT_PUBLIC_AUTH_WEB_URL?.replace(/\/+$/, "") ||
  "http://localhost:3003";

export interface SsoUserPayload {
  id: string;
  email: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  email_verified_at?: number | null;
  app_roles: Record<string, string[]>;
  app_permissions: Record<string, string[]>;
  created_at: number;
  updated_at: number;
}

export type SsoTokenExchangeResponse =
  | {
      status: "authenticated";
      token: string;
      expires_in: number;
      user: SsoUserPayload;
    }
  | {
      status: "consent_required";
      app: {
        id: string;
        name: string;
        description: string;
        icon_url: string | null;
        default_role_name: string | null;
        require_consent: boolean;
      };
      consent_url: string;
    }
  | {
      status: "unauthenticated";
    };

export function resolveSafeRedirectUri(redirectPath?: string | null): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  if (!redirectPath) {
    return window.location.href;
  }
  if (redirectPath.startsWith("/") && !redirectPath.startsWith("//")) {
    return `${origin}${redirectPath}`;
  }
  try {
    const parsed = new URL(redirectPath);
    if (parsed.origin === origin) {
      return parsed.toString();
    }
  } catch {
    // fall through
  }
  return `${origin}/`;
}

export function buildAuthPortalUrl(
  mode: "login" | "register",
  redirectUri?: string
): string {
  const params = new URLSearchParams({ app: OPEN_PO_APP_ID });
  const target = redirectUri || resolveSafeRedirectUri();
  if (target) {
    params.set("redirect_uri", target);
  }
  return `${AUTH_WEB_URL}/${mode}?${params.toString()}`;
}

export function buildAccountPortalUrl(): string {
  return `${AUTH_WEB_URL}/account`;
}

export async function exchangeSsoToken(
  redirectUri?: string
): Promise<SsoTokenExchangeResponse> {
  const body: { app_id: string; redirect_uri?: string } = {
    app_id: OPEN_PO_APP_ID,
  };
  if (redirectUri) {
    body.redirect_uri = redirectUri;
  }

  const response = await fetch(`${AUTH_API_URL}/api/v1/sso/token`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Niwa-Requested-With": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { status: "unauthenticated" };
  }

  const data = (await response.json().catch(() => null)) as
    | SsoTokenExchangeResponse
    | null;
  return data ?? { status: "unauthenticated" };
}

export async function logoutSso(): Promise<void> {
  await fetch(`${AUTH_API_URL}/api/v1/sso/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Niwa-Requested-With": "fetch",
    },
    body: JSON.stringify({}),
  }).catch(() => undefined);
}
