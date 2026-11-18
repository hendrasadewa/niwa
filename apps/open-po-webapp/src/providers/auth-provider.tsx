"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { LoginInput, RegisterInput } from "@niwa/open-po-validators";
import type { AuthResponse, ProfileResponse, Store, User } from "@/types/api";
import {
  ACTIVE_STORE_STORAGE_KEY,
  apiClient,
  clearAuthToken,
  getAuthToken,
  getStoredOwnedStores,
  getStoredUser,
  setAuthToken,
  setOnUnauthorizedHandler,
  setStoredOwnedStores,
  setStoredUser,
} from "@/lib/api";

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
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => void;
  refreshProfile: () => Promise<ProfileResponse | null>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [ownedStores, setOwnedStores] = React.useState<Store[]>([]);
  const [activeStoreId, setActiveStoreIdState] = React.useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(true);

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

  const logout = React.useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    setOwnedStores([]);
    setActiveStoreIdState(null);
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  React.useEffect(() => {
    setOnUnauthorizedHandler(() => {
      clearAuthToken();
      setToken(null);
      setUser(null);
      setOwnedStores([]);
      setActiveStoreIdState(null);
      queryClient.clear();
      router.push("/login");
    });

    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, [queryClient, router]);

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

  const refreshProfile =
    React.useCallback(async (): Promise<ProfileResponse | null> => {
      const activeToken = getAuthToken();
      if (!activeToken) {
        setToken(null);
        setUser(null);
        setOwnedStores([]);
        return null;
      }

      try {
        const response = await apiClient.get<ProfileResponse>("/api/v1/me", {
          skipAuthRedirect: true,
        });
        syncProfileState(response, activeToken);
        return response;
      } catch {
        clearAuthToken();
        setToken(null);
        setUser(null);
        setOwnedStores([]);
        return null;
      }
    }, [syncProfileState]);

  React.useEffect(() => {
    let mounted = true;

    async function hydrateAuth() {
      const storedToken = getAuthToken();
      const cachedUser = getStoredUser();
      const cachedStores = getStoredOwnedStores();

      if (!storedToken) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      if (mounted) {
        setToken(storedToken);
        if (cachedUser) {
          setUser(cachedUser);
        }
        if (cachedStores.length > 0) {
          setOwnedStores(cachedStores);
          const savedId =
            typeof window !== "undefined"
              ? window.localStorage.getItem(ACTIVE_STORE_STORAGE_KEY)
              : null;
          const matched = cachedStores.find((s) => s.id === savedId);
          setActiveStoreIdState(matched ? matched.id : cachedStores[0]!.id);
        }
      }

      try {
        const response = await apiClient.get<ProfileResponse>("/api/v1/me", {
          skipAuthRedirect: true,
        });
        if (mounted) {
          syncProfileState(response, storedToken);
        }
      } catch {
        if (mounted && !cachedUser) {
          clearAuthToken();
          setToken(null);
          setUser(null);
          setOwnedStores([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    hydrateAuth();

    return () => {
      mounted = false;
    };
  }, [syncProfileState]);

  const login = React.useCallback(
    async (input: LoginInput): Promise<AuthResponse> => {
      const response = await apiClient.post<AuthResponse>(
        "/api/v1/auth/login",
        input,
        { skipAuthRedirect: true }
      );
      setAuthToken(response.token);
      setStoredUser(response.user);
      setToken(response.token);
      setUser(response.user);

      // Immediately fetch stores owned by this user
      try {
        const profile = await apiClient.get<ProfileResponse>("/api/v1/me", {
          skipAuthRedirect: true,
        });
        syncProfileState(profile, response.token);
      } catch {
        // ignore
      }

      return response;
    },
    [syncProfileState]
  );

  const register = React.useCallback(
    async (input: RegisterInput): Promise<AuthResponse> => {
      const response = await apiClient.post<AuthResponse>(
        "/api/v1/auth/register",
        input,
        { skipAuthRedirect: true }
      );
      setAuthToken(response.token);
      setStoredUser(response.user);
      setToken(response.token);
      setUser(response.user);
      setOwnedStores([]);
      setStoredOwnedStores([]);
      return response;
    },
    []
  );

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
      login,
      register,
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
      login,
      register,
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
