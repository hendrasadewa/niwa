"use client";

import * as React from "react";
import {
  isAuthRedirectPath,
  resolveSafeRedirectUri,
  type NiwaSsoClient,
} from "../client";
import type { SsoUserPayload } from "../types";

export interface NiwaSsoSyncResult {
  user: SsoUserPayload | null;
  token: string | null;
  redirecting: boolean;
}

export interface UseNiwaSsoSessionOptions {
  client: NiwaSsoClient;
  pathname?: string | null;
  protectedPrefixes?: ReadonlyArray<string>;
  postLogoutRedirect?: "login" | "home";
  visibilityRecheckMinMs?: number;
  onAuthenticated?: (result: {
    user: SsoUserPayload;
    token: string;
  }) => void | Promise<void>;
  onCleared?: () => void;
}

export interface NiwaSsoSessionState {
  ssoUser: SsoUserPayload | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithSso: (redirectUri?: string) => void;
  registerWithSso: (redirectUri?: string) => void;
  logout: () => void;
  syncSession: (options?: {
    silent?: boolean;
    redirectOnConsent?: boolean;
  }) => Promise<NiwaSsoSyncResult>;
  clearLocalSession: () => void;
}

function matchesProtectedPrefix(
  pathname: string | null | undefined,
  prefixes?: ReadonlyArray<string>
): boolean {
  if (!pathname || !prefixes || prefixes.length === 0) return false;
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Reusable React hook that manages the full first-party Niwa SSO lifecycle:
 * - Silent token exchange via HttpOnly `__Host-niwa_session` cookie
 * - Automatic `/consent` redirect without racing client-side guards
 * - In-memory ES256 token refresh 60s before expiry
 * - Tab-focus Global Single Logout propagation (`visibilitychange`)
 * - Safe logout that awaits `/api/v1/sso/logout` before redirecting
 */
export function useNiwaSsoSession(
  options: UseNiwaSsoSessionOptions
): NiwaSsoSessionState {
  const {
    client,
    pathname,
    protectedPrefixes,
    postLogoutRedirect = "login",
    visibilityRecheckMinMs = 30_000,
    onAuthenticated,
    onCleared,
  } = options;

  const [token, setToken] = React.useState<string | null>(null);
  const [ssoUser, setSsoUser] = React.useState<SsoUserPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastSyncAtRef = React.useRef<number>(0);
  const onAuthenticatedRef = React.useRef(onAuthenticated);
  const onClearedRef = React.useRef(onCleared);

  React.useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated;
    onClearedRef.current = onCleared;
  }, [onAuthenticated, onCleared]);

  const clearRefreshTimer = React.useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearLocalSession = React.useCallback(() => {
    clearRefreshTimer();
    client.clearAccessToken();
    setToken(null);
    setSsoUser(null);
    onClearedRef.current?.();
  }, [clearRefreshTimer, client]);

  const loginWithSso = React.useCallback(
    (redirectUri?: string) => {
      if (typeof window === "undefined") return;
      window.location.assign(client.buildAuthPortalUrl("login", redirectUri));
    },
    [client]
  );

  const registerWithSso = React.useCallback(
    (redirectUri?: string) => {
      if (typeof window === "undefined") return;
      window.location.assign(
        client.buildAuthPortalUrl("register", redirectUri)
      );
    },
    [client]
  );

  const logout = React.useCallback(() => {
    clearRefreshTimer();
    // Hold loading state so route guards don't abort the in-flight logout POST
    setIsLoading(true);

    void client.logoutSso().finally(() => {
      client.clearAccessToken();
      setToken(null);
      setSsoUser(null);
      onClearedRef.current?.();

      if (typeof window !== "undefined") {
        const target =
          postLogoutRedirect === "home"
            ? "/"
            : client.buildAuthPortalUrl("login", `${window.location.origin}/`);
        window.location.replace(target);
      }
    });
  }, [clearRefreshTimer, client, postLogoutRedirect]);

  const syncSession = React.useCallback(
    async (syncOpts?: {
      silent?: boolean;
      redirectOnConsent?: boolean;
    }): Promise<NiwaSsoSyncResult> => {
      const redirectUri =
        typeof window !== "undefined" ? resolveSafeRedirectUri() : undefined;

      try {
        const result = await client.exchangeSsoToken(redirectUri);
        lastSyncAtRef.current = Date.now();

        if (result.status === "authenticated") {
          client.setAccessToken(result.token);
          setToken(result.token);
          setSsoUser(result.user);

          clearRefreshTimer();
          const refreshDelayMs = Math.max(
            (result.expires_in - 60) * 1000,
            15_000
          );
          refreshTimerRef.current = setTimeout(() => {
            void syncSession({ silent: true, redirectOnConsent: false });
          }, refreshDelayMs);

          await onAuthenticatedRef.current?.({
            user: result.user,
            token: result.token,
          });

          return {
            user: result.user,
            token: result.token,
            redirecting: false,
          };
        }

        if (result.status === "consent_required") {
          clearLocalSession();
          if (
            syncOpts?.redirectOnConsent !== false &&
            typeof window !== "undefined"
          ) {
            window.location.replace(result.consent_url);
            return { user: null, token: null, redirecting: true };
          }
          return { user: null, token: null, redirecting: false };
        }

        clearLocalSession();
        return { user: null, token: null, redirecting: false };
      } catch {
        if (!syncOpts?.silent) {
          clearLocalSession();
        }
        return { user: null, token: null, redirecting: false };
      }
    },
    [clearLocalSession, clearRefreshTimer, client]
  );

  // Initial hydration (skipped on /login & /register redirect routes)
  React.useEffect(() => {
    if (isAuthRedirectPath(pathname)) {
      setIsLoading(false);
      return;
    }

    let active = true;

    async function hydrate() {
      const { redirecting } = await syncSession({ redirectOnConsent: false });
      if (active && !redirecting) {
        setIsLoading(false);
      }
    }

    void hydrate();

    return () => {
      active = false;
      clearRefreshTimer();
    };
  }, [pathname, syncSession, clearRefreshTimer]);

  // Enforce login on protected route prefixes
  React.useEffect(() => {
    if (isLoading) return;
    if (
      !token &&
      matchesProtectedPrefix(pathname, protectedPrefixes) &&
      typeof window !== "undefined"
    ) {
      window.location.replace(
        client.buildAuthPortalUrl("login", window.location.href)
      );
    }
  }, [isLoading, token, pathname, protectedPrefixes, client]);

  // Tab-focus recheck for Global Single Logout propagation
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (isAuthRedirectPath(pathname)) return;
      if (Date.now() - lastSyncAtRef.current < visibilityRecheckMinMs) {
        return;
      }
      void syncSession({ silent: true, redirectOnConsent: false });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, syncSession, visibilityRecheckMinMs]);

  return {
    ssoUser,
    token,
    isAuthenticated: Boolean(token && ssoUser),
    isLoading,
    loginWithSso,
    registerWithSso,
    logout,
    syncSession,
    clearLocalSession,
  };
}

export function useSsoPortalRedirect(
  client: NiwaSsoClient,
  mode: "login" | "register",
  redirectParam?: string | null
) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const redirectUri = resolveSafeRedirectUri(redirectParam || "/");
    window.location.replace(client.buildAuthPortalUrl(mode, redirectUri));
  }, [client, mode, redirectParam]);
}
