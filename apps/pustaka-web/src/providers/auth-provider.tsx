"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProfileResponse, User } from "@/types/api";
import {
  apiClient,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  setOnUnauthorizedHandler,
  setStoredUser,
} from "@/lib/api";
import {
  PUSTAKA_APP_ID,
  buildAuthPortalUrl,
  exchangeSsoToken,
  logoutSso,
  type SsoUserPayload,
} from "@/lib/sso";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  loginWithSso: (redirectUri?: string) => void;
  registerWithSso: (redirectUri?: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

function mapSsoUser(ssoUser: SsoUserPayload): User {
  return {
    id: ssoUser.id,
    username: ssoUser.name,
    email: ssoUser.email,
    roles: ssoUser.app_roles[PUSTAKA_APP_ID] ?? [],
    permissions: ssoUser.app_permissions[PUSTAKA_APP_ID] ?? [],
    created_at: ssoUser.created_at,
  };
}

const VISIBILITY_RECHECK_MIN_MS = 30_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastSyncAtRef = React.useRef<number>(0);

  const clearRefreshTimer = React.useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const loginWithSso = React.useCallback((redirectUri?: string) => {
    if (typeof window === "undefined") return;
    window.location.assign(buildAuthPortalUrl("login", redirectUri));
  }, []);

  const registerWithSso = React.useCallback((redirectUri?: string) => {
    if (typeof window === "undefined") return;
    window.location.assign(buildAuthPortalUrl("register", redirectUri));
  }, []);

  const logout = React.useCallback(() => {
    clearRefreshTimer();
    clearAuthToken();
    setToken(null);
    setUser(null);
    queryClient.clear();

    void logoutSso().finally(() => {
      if (typeof window !== "undefined") {
        window.location.replace(
          buildAuthPortalUrl("login", `${window.location.origin}/`)
        );
      }
    });
  }, [clearRefreshTimer, queryClient]);

  const syncSsoSession = React.useCallback(
    async (options?: {
      silent?: boolean;
      redirectOnConsent?: boolean;
    }): Promise<User | null> => {
      const redirectUri =
        typeof window !== "undefined" ? window.location.href : undefined;

      try {
        const result = await exchangeSsoToken(redirectUri);
        lastSyncAtRef.current = Date.now();

        if (result.status === "authenticated") {
          setAuthToken(result.token);
          setToken(result.token);

          const mappedUser = mapSsoUser(result.user);
          setStoredUser(mappedUser);
          setUser(mappedUser);

          // Schedule silent token refresh ~60s before expiry
          clearRefreshTimer();
          const refreshDelayMs = Math.max(
            (result.expires_in - 60) * 1000,
            15_000
          );
          refreshTimerRef.current = setTimeout(() => {
            void syncSsoSession({ silent: true, redirectOnConsent: true });
          }, refreshDelayMs);

          return mappedUser;
        }

        if (result.status === "consent_required") {
          clearRefreshTimer();
          clearAuthToken();
          setToken(null);
          setUser(null);
          if (
            options?.redirectOnConsent !== false &&
            typeof window !== "undefined"
          ) {
            window.location.replace(result.consent_url);
          }
          return null;
        }

        // Unauthenticated
        clearRefreshTimer();
        clearAuthToken();
        setToken(null);
        setUser(null);
        return null;
      } catch {
        if (!options?.silent) {
          clearRefreshTimer();
          clearAuthToken();
          setToken(null);
          setUser(null);
        }
        return null;
      }
    },
    [clearRefreshTimer]
  );

  React.useEffect(() => {
    setOnUnauthorizedHandler(() => {
      clearRefreshTimer();
      clearAuthToken();
      setToken(null);
      setUser(null);
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.replace(buildAuthPortalUrl("login"));
      }
    });

    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, [clearRefreshTimer, queryClient]);

  React.useEffect(() => {
    let active = true;

    async function hydrate() {
      const result = await syncSsoSession({ redirectOnConsent: true });
      if (active) {
        // Keep loading true if consent redirect is in progress
        if (result !== null || typeof window === "undefined") {
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }
    }

    void hydrate();

    return () => {
      active = false;
      clearRefreshTimer();
    };
  }, [syncSsoSession, clearRefreshTimer]);

  // Re-verify session on tab focus to propagate Global Single Logout promptly
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastSyncAtRef.current < VISIBILITY_RECHECK_MIN_MS) {
        return;
      }
      void syncSsoSession({ silent: true, redirectOnConsent: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncSsoSession]);

  const refreshProfile = React.useCallback(async (): Promise<User | null> => {
    const activeToken = getAuthToken();
    if (!activeToken) {
      return syncSsoSession({ redirectOnConsent: true });
    }

    try {
      const response = await apiClient.get<ProfileResponse>(
        "/api/v1/users/profile",
        { skipAuthRedirect: true }
      );
      setToken(activeToken);
      setUser(response.user);
      setStoredUser(response.user);
      return response.user;
    } catch {
      return syncSsoSession({ redirectOnConsent: true });
    }
  }, [syncSsoSession]);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(user?.roles?.includes("admin"));

  const hasPermission = React.useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.roles?.includes("admin")) return true;
      return Boolean(user.permissions?.includes(permission));
    },
    [user]
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated,
      isAdmin,
      isLoading,
      hasPermission,
      loginWithSso,
      registerWithSso,
      logout,
      refreshProfile,
    }),
    [
      user,
      token,
      isAuthenticated,
      isAdmin,
      isLoading,
      hasPermission,
      loginWithSso,
      registerWithSso,
      logout,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
