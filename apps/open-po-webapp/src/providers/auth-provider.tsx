"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useNiwaSsoSession } from "@niwa/auth/react";
import type { SsoUserPayload } from "@niwa/auth/types";
import type { ProfileResponse, Store, User } from "@/types/api";
import {
  ACTIVE_STORE_STORAGE_KEY,
  apiClient,
  clearAuthToken,
  getAuthToken,
  setOnUnauthorizedHandler,
  setStoredOwnedStores,
  setStoredUser,
} from "@/lib/api";
import { OPEN_PO_APP_ID, openPoSsoClient } from "@/lib/sso";

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
  const [user, setUser] = React.useState<User | null>(null);
  const [ownedStores, setOwnedStores] = React.useState<Store[]>([]);
  const [activeStoreId, setActiveStoreIdState] = React.useState<string | null>(
    null
  );

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

  const syncProfileState = React.useCallback((profile: ProfileResponse) => {
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
      setActiveStoreIdState(matched ? matched.id : stores[0]!.id);
    } else {
      setActiveStoreIdState(null);
    }
  }, []);

  const hydrateOpenPoProfile = React.useCallback(
    async (fallbackUser?: User): Promise<ProfileResponse | null> => {
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
        syncProfileState(mergedProfile);
        return mergedProfile;
      } catch {
        if (fallbackUser) {
          const fallbackProfile: ProfileResponse = {
            user: fallbackUser,
            stores: [],
          };
          syncProfileState(fallbackProfile);
          return fallbackProfile;
        }
        return null;
      }
    },
    [syncProfileState]
  );

  const sso = useNiwaSsoSession({
    client: openPoSsoClient,
    pathname,
    postLogoutRedirect: "home",
    onAuthenticated: async ({ user: ssoUser }) => {
      await hydrateOpenPoProfile(mapSsoUserFallback(ssoUser));
    },
    onCleared: () => {
      clearAuthToken();
      setUser(null);
      setOwnedStores([]);
      setActiveStoreIdState(null);
      queryClient.clear();
    },
  });

  React.useEffect(() => {
    setOnUnauthorizedHandler(() => {
      sso.clearLocalSession();
    });
    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, [sso.clearLocalSession]);

  const refreshProfile =
    React.useCallback(async (): Promise<ProfileResponse | null> => {
      const activeToken = getAuthToken();
      if (!activeToken) {
        const { user: ssoUser } = await sso.syncSession({
          redirectOnConsent: false,
        });
        return ssoUser ? hydrateOpenPoProfile(mapSsoUserFallback(ssoUser)) : null;
      }
      const profile = await hydrateOpenPoProfile();
      if (!profile) {
        const { user: ssoUser } = await sso.syncSession({
          redirectOnConsent: false,
        });
        return ssoUser ? hydrateOpenPoProfile(mapSsoUserFallback(ssoUser)) : null;
      }
      return profile;
    }, [hydrateOpenPoProfile, sso.syncSession]);

  const activeStore = React.useMemo(() => {
    if (ownedStores.length === 0) return null;
    return (
      ownedStores.find((s) => s.id === activeStoreId) ?? ownedStores[0] ?? null
    );
  }, [ownedStores, activeStoreId]);

  const isAuthenticated = Boolean(sso.token && user);
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
      token: sso.token,
      ownedStores,
      activeStore,
      setActiveStoreId,
      isAuthenticated,
      isSeller,
      isAdmin,
      isLoading: sso.isLoading,
      hasPermission,
      loginWithSso: sso.loginWithSso,
      registerWithSso: sso.registerWithSso,
      logout: sso.logout,
      refreshProfile,
    }),
    [
      user,
      sso.token,
      ownedStores,
      activeStore,
      setActiveStoreId,
      isAuthenticated,
      isSeller,
      isAdmin,
      sso.isLoading,
      hasPermission,
      sso.loginWithSso,
      sso.registerWithSso,
      sso.logout,
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
