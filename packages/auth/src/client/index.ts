import type { SsoTokenExchangeResponse } from "../types";

export const DEFAULT_AUTH_API_URL = "http://localhost:8788";
export const DEFAULT_AUTH_WEB_URL = "http://localhost:3003";

export interface NiwaSsoClientConfig {
  appId: string;
  authApiUrl?: string;
  authWebUrl?: string;
}

export function isAuthRedirectPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/")
  );
}

export function resolveSafeRedirectUri(redirectPath?: string | null): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const fallback = `${origin}/`;

  if (!redirectPath) {
    return isAuthRedirectPath(window.location.pathname)
      ? fallback
      : window.location.href;
  }

  if (redirectPath.startsWith("/") && !redirectPath.startsWith("//")) {
    const cleanPath = redirectPath.split("?")[0] ?? "/";
    return isAuthRedirectPath(cleanPath) ? fallback : `${origin}${redirectPath}`;
  }

  try {
    const parsed = new URL(redirectPath);
    if (parsed.origin === origin && !isAuthRedirectPath(parsed.pathname)) {
      return parsed.toString();
    }
  } catch {
    // fall through
  }

  return fallback;
}

export function createNiwaSsoClient(config: NiwaSsoClientConfig) {
  const appId = config.appId;
  const authApiUrl = (config.authApiUrl || DEFAULT_AUTH_API_URL).replace(
    /\/+$/,
    ""
  );
  const authWebUrl = (config.authWebUrl || DEFAULT_AUTH_WEB_URL).replace(
    /\/+$/,
    ""
  );

  // Access JWT is stored strictly in-memory (never persisted to localStorage)
  let inMemoryToken: string | null = null;
  let inFlightRefresh: Promise<string | null> | null = null;

  function buildAuthPortalUrl(
    mode: "login" | "register",
    redirectUri?: string
  ): string {
    const params = new URLSearchParams({ app: appId });
    const target = redirectUri || resolveSafeRedirectUri();
    if (target) {
      params.set("redirect_uri", target);
    }
    return `${authWebUrl}/${mode}?${params.toString()}`;
  }

  function buildAccountPortalUrl(): string {
    return `${authWebUrl}/account`;
  }

  async function exchangeSsoToken(
    redirectUri?: string
  ): Promise<SsoTokenExchangeResponse> {
    const body: { app_id: string; redirect_uri?: string } = { app_id: appId };
    if (redirectUri) {
      body.redirect_uri = redirectUri;
    }

    const response = await fetch(`${authApiUrl}/api/v1/sso/token`, {
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

  async function logoutSso(): Promise<void> {
    await fetch(`${authApiUrl}/api/v1/sso/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Niwa-Requested-With": "fetch",
      },
      body: JSON.stringify({}),
    }).catch(() => undefined);
  }

  function getAccessToken(): string | null {
    return inMemoryToken;
  }

  function setAccessToken(token: string | null): void {
    inMemoryToken = token;
  }

  function clearAccessToken(): void {
    inMemoryToken = null;
  }

  async function refreshAccessToken(): Promise<string | null> {
    if (inFlightRefresh) {
      return inFlightRefresh;
    }

    inFlightRefresh = (async () => {
      try {
        const redirectUri =
          typeof window !== "undefined" ? resolveSafeRedirectUri() : undefined;
        const result = await exchangeSsoToken(redirectUri);

        if (result.status === "authenticated") {
          inMemoryToken = result.token;
          return result.token;
        }

        if (
          result.status === "consent_required" &&
          typeof window !== "undefined"
        ) {
          window.location.replace(result.consent_url);
        }

        return null;
      } catch {
        return null;
      } finally {
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  }

  return {
    appId,
    authApiUrl,
    authWebUrl,
    buildAuthPortalUrl,
    buildAccountPortalUrl,
    exchangeSsoToken,
    logoutSso,
    getAccessToken,
    setAccessToken,
    clearAccessToken,
    refreshAccessToken,
  };
}

export type NiwaSsoClient = ReturnType<typeof createNiwaSsoClient>;
