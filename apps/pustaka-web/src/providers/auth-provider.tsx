"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useNiwaSsoSession } from "@niwa/auth/react";
import type { SsoUserPayload } from "@niwa/auth/types";
import type { ProfileResponse, User } from "@/types/api";
import {
  apiClient,
  clearAuthToken,
  getAuthToken,
  setOnUnauthorizedHandler,
  setStoredUser,
} from "@/lib/api";
import { PUSTAKA_APP_ID, pustakaSsoClient } from "@/lib/sso";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState<User | null>(null);

  const sso = useNiwaSsoSession({
    client: pustakaSsoClient,
    pathname,
    postLogoutRedirect: "home",
    onAuthenticated: ({ user: ssoUser }) => {
      const mapped = mapSsoUser(ssoUser);
      setStoredUser(mapped);
      setUser(mapped);
    },
    onCleared: () => {
      clearAuthToken();
      setUser(null);
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

  const refreshProfile = React.useCallback(async (): Promise<User | null> => {
    const activeToken = getAuthToken();
    if (!activeToken) {
      const { user: ssoUser } = await sso.syncSession({
        redirectOnConsent: false,
      });
      return ssoUser ? mapSsoUser(ssoUser) : null;
    }

    try {
      const response = await apiClient.get<ProfileResponse>(
        "/api/v1/users/profile",
        { skipAuthRedirect: true }
      );
      setUser(response.user);
      setStoredUser(response.user);
      return response.user;
    } catch {
      const { user: ssoUser } = await sso.syncSession({
        redirectOnConsent: false,
      });
      return ssoUser ? mapSsoUser(ssoUser) : null;
    }
  }, [sso.syncSession]);

  const isAuthenticated = Boolean(sso.token && user);
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
      token: sso.token,
      isAuthenticated,
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
      isAuthenticated,
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
