"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useNiwaSsoSession } from "@niwa/auth/react";
import type { SsoUserPayload } from "@niwa/auth/types";
import {
  clearAuthToken,
  setOnUnauthorizedHandler,
} from "@/lib/api";
import { BLOG_APP_ID, blogSsoClient } from "@/lib/sso";
import type { BlogUser } from "@/types/api";

export interface AuthContextValue {
  user: BlogUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  loginWithSso: (redirectUri?: string) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

function mapSsoUser(ssoUser: SsoUserPayload): BlogUser {
  return {
    id: ssoUser.id,
    username: ssoUser.name,
    email: ssoUser.email,
    roles: ssoUser.app_roles[BLOG_APP_ID] ?? [],
    permissions: ssoUser.app_permissions[BLOG_APP_ID] ?? [],
    created_at: ssoUser.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState<BlogUser | null>(null);

  const sso = useNiwaSsoSession({
    client: blogSsoClient,
    pathname,
    postLogoutRedirect: "home",
    onAuthenticated: ({ user: ssoUser }) => {
      setUser(mapSsoUser(ssoUser));
    },
    onCleared: () => {
      clearAuthToken();
      setUser(null);
      queryClient.clear();
    },
  });

  const { clearLocalSession } = sso;

  React.useEffect(() => {
    setOnUnauthorizedHandler(() => {
      clearLocalSession();
    });
    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, [clearLocalSession]);

  const isAuthenticated = Boolean(sso.token && user);
  const isAdmin = Boolean(user?.roles?.includes("admin"));

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      token: sso.token,
      isAuthenticated,
      isAdmin,
      isLoading: sso.isLoading,
      loginWithSso: sso.loginWithSso,
      logout: sso.logout,
    }),
    [
      user,
      sso.token,
      isAuthenticated,
      isAdmin,
      sso.isLoading,
      sso.loginWithSso,
      sso.logout,
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
