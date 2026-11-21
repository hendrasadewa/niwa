"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ProfileResponse, Store, User } from "@/types/api";
import {
  ACTIVE_STORE_STORAGE_KEY,
  apiClient,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  setOnUnauthorizedHandler,
  setStoredOwnedStores,
  setStoredUser,
} from "@/lib/api";
import {
  OPEN_PO_APP_ID,
  buildAuthPortalUrl,
  exchangeSsoToken,
  logoutSso,
  type SsoUserPayload,
} from "@/lib/sso";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  ownedStores: Store[];
  activeStore: Store | null;
  setActiveStoreId: (storeId: string) => void;
  isAuthenticated: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  loginWithSso: (redirectUri?: string) => void;
  registerWithSso: (redirectUri?: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<ProfileResponse | null>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

const PROTECTED_PREFIXES = ["/profile", "/orders", "/seller"];
const VISIBILITY_RECHECK_MIN_MS = 30_000;

function isProtectedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function mapSsoUserFallback(ssoUser: SsoUserPayload): User {
  return {
    id: ssoUser.id,
    name: ssoUser.name,
    email: ssoUser.email,
    whatsapp_number: ssoUser.whatsapp_number,
    default_shipping_address: null,
    roles: ssoUser.app_roles[OPEN_PO_APP_ID] ?? [],
    permissions: ssoUser.app_permissions[OPEN_PO_APP_ID] ?? [],
    created_at: ssoUser.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [ownedStores, setOwnedStores] = React.useState<Store[]>([]);
  const [activeStoreId, setActiveStoreIdState] = React.useState<string | null>(
    null
  );
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

  const setActiveStoreId = React.useCallback((storeId: string) => {
    setActiveStoreIdState(storeId);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, storeId);
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const syncProfileState = React.useCallback(
    (profile: ProfileResponse, activeToken: string) => {
      setToken(activeToken);
      setUser(profile.user);
      setStoredUser(profile.user);
      const stores = profile.stores ?? [];
      setOwnedStores(stores);
      setStoredOwnedStores(stores);

      if (stores.length > 0) {
        const savedId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(ACTIVE_STORE_STORAGE_KEY)
            : null;
        const matched = stores.find((s) => s.id === savedId);
        const targetId = matched ? matched.id : stores[0]!.id;
        setActiveStoreIdState(targetId);
      } else {
        setActiveStoreIdState(null);
      }
    },
    []
  );

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
    setOwnedStores([]);
    setActiveStoreIdState(null);
    queryClient.clear();

    void logoutSso().finally(() => {
      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    });
  }, [clearRefreshTimer, queryClient]);

  const hydrateOpenPoProfile = React.useCallback(
    async (
      activeToken: string,
      fallbackUser?: User
    ): Promise<ProfileResponse | null> => {
      try {
        const [response, storesResponse] = await Promise.all([
          apiClient.get<ProfileResponse>("/api/v1/me", {
            skipAuthRedirect: true,
          }),
          apiClient
            .get<{ stores: Store[] }>("/api/v1/me/stores", {
              skipAuthRedirect: true,
            })
            .catch(() => null),
        ]);
        const mergedProfile: ProfileResponse = {
          user: response.user,
          stores: storesResponse?.stores ?? response.stores ?? [],
        };
        syncProfileState(mergedProfile, activeToken);
        return mergedProfile;
      } catch {
        if (fallbackUser) {
          const fallbackProfile: ProfileResponse = {
            user: fallbackUser,
            stores: [],
          };
          syncProfileState(fallbackProfile, activeToken);
          return fallbackProfile;
        }
        return null;
      }
    },
    [syncProfileState]
  );

  const syncSsoSession = React.useCallback(
    async (options?: {
      silent?: boolean;
      redirectOnConsent?: boolean;
    }): Promise<ProfileResponse | null> => {
      const redirectUri =
        typeof window !== "undefined" ? window.location.href : undefined;

      try {
        const result = await exchangeSsoToken(redirectUri);
        lastSyncAtRef.current = Date.now();

        if (result.status === "authenticated") {
          setAuthToken(result.token);
          setToken(result.token);

          clearRefreshTimer();
          const refreshDelayMs = Math.max(
            (result.expires_in - 60) * 1000,
            15_000
          );
          refreshTimerRef.current = setTimeout(() => {
            void syncSsoSession({ silent: true, redirectOnConsent: true });
          }, refreshDelayMs);

          return hydrateOpenPoProfile(
            result.token,
            mapSsoUserFallback(result.user)
          );
        }

        if (result.status === "consent_required") {
          clearRefreshTimer();
          clearAuthToken();
          setToken(null);
          setUser(null);
          setOwnedStores([]);
          setActiveStoreIdState(null);
          if (
            options?.redirectOnConsent !== false &&
            typeof window !== "undefined"
          ) {
            window.location.replace(result.consent_url);
          }
          return null;
        }

        clearRefreshTimer();
        clearAuthToken();
        setToken(null);
        setUser(null);
        setOwnedStores([]);
        setActiveStoreIdState(null);
        return null;
      } catch {
        if (!options?.silent) {
          clearRefreshTimer();
          clearAuthToken();
          setToken(null);
          setUser(null);
          setOwnedStores([]);
          setActiveStoreIdState(null);
        }
        return null;
      }
    },
    [clearRefreshTimer, hydrateOpenPoProfile]
  );

  React.useEffect(() => {
    setOnUnauthorizedHandler(() => {
      clearRefreshTimer();
      clearAuthToken();
      setToken(null);
      setUser(null);
      setOwnedStores([]);
      setActiveStoreIdState(null);
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
      await syncSsoSession({ redirectOnConsent: true });
      if (active) {
        setIsLoading(false);
      }
    }

    void hydrate();

    return () => {
      active = false;
      clearRefreshTimer();
    };
  }, [syncSsoSession, clearRefreshTimer]);

  // Enforce login on protected routes (/profile, /orders, /seller)
  React.useEffect(() => {
    if (isLoading) return;
    if (!token && isProtectedPath(pathname) && typeof window !== "undefined") {
      window.location.replace(buildAuthPortalUrl("login", window.location.href));
    }
  }, [isLoading, token, pathname]);

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

  const refreshProfile =
    React.useCallback(async (): Promise<ProfileResponse | null> => {
      const activeToken = getAuthToken();
      if (!activeToken) {
        return syncSsoSession({ redirectOnConsent: true });
      }
      const profile = await hydrateOpenPoProfile(activeToken);
      if (!profile) {
        return syncSsoSession({ redirectOnConsent: true });
      }
      return profile;
    }, [hydrateOpenPoProfile, syncSsoSession]);

  const activeStore = React.useMemo(() => {
    if (ownedStores.length === 0) return null;
    return (
      ownedStores.find((s) => s.id === activeStoreId) ?? ownedStores[0] ?? null
    );
  }, [ownedStores, activeStoreId]);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(user?.roles?.includes("admin"));
  const isSeller = Boolean(
    isAdmin || user?.roles?.includes("seller") || ownedStores.length > 0
  );

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
      ownedStores,
      activeStore,
      setActiveStoreId,
      isAuthenticated,
      isSeller,
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
      ownedStores,
      activeStore,
      setActiveStoreId,
      isAuthenticated,
      isSeller,
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
