"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { LoginInput, RegisterInput } from "@niwa/pustaka-validators";
import type { AuthResponse, ProfileResponse, User } from "@/types/api";
import {
  apiClient,
  clearAuthToken,
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setOnUnauthorizedHandler,
  setStoredUser,
} from "@/lib/api";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => void;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const logout = React.useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  React.useEffect(() => {
    setOnUnauthorizedHandler(() => {
      clearAuthToken();
      setToken(null);
      setUser(null);
      queryClient.clear();
      router.push("/login");
    });

    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, [queryClient, router]);

  const refreshProfile = React.useCallback(async (): Promise<User | null> => {
    const activeToken = getAuthToken();
    if (!activeToken) {
      setToken(null);
      setUser(null);
      return null;
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
      clearAuthToken();
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    async function hydrateAuth() {
      const storedToken = getAuthToken();
      const cachedUser = getStoredUser();

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
      }

      try {
        const response = await apiClient.get<ProfileResponse>(
          "/api/v1/users/profile",
          { skipAuthRedirect: true }
        );
        if (mounted) {
          setUser(response.user);
          setStoredUser(response.user);
        }
      } catch {
        if (mounted && !cachedUser) {
          clearAuthToken();
          setToken(null);
          setUser(null);
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
  }, []);

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
      return response;
    },
    []
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
      return response;
    },
    []
  );

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
      login,
      register,
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
