import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, type AuthUser, isApiError } from "../lib/auth-api";

const AUTH_WEB_APP_ID = "auth-web";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const VISIBILITY_CHECK_THROTTLE_MS = 30_000;

interface CachedAdminToken {
  token: string;
  expiresAtMs: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<AuthUser | null>;
  getAdminToken: () => Promise<string>;
  signOut: () => Promise<void>;
  clearLocalSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function isUserAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  return Object.values(user.app_roles).some((roles) => roles.includes("admin"));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // In-memory ES256 JWT for /api/v1/acl/* (never persisted to localStorage/sessionStorage)
  const adminTokenRef = useRef<CachedAdminToken | null>(null);
  const inflightTokenPromiseRef = useRef<Promise<string> | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const lastVisibilityCheckRef = useRef<number>(0);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearAdminToken = useCallback(() => {
    clearRefreshTimer();
    adminTokenRef.current = null;
    inflightTokenPromiseRef.current = null;
  }, [clearRefreshTimer]);

  const setUser = useCallback(
    (nextUser: AuthUser | null) => {
      setUserState(nextUser);
      if (!nextUser) {
        clearAdminToken();
      }
    },
    [clearAdminToken]
  );

  const clearLocalSession = useCallback(() => {
    setUserState(null);
    clearAdminToken();
  }, [clearAdminToken]);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { user: fetchedUser } = await authApi.getMe();
      setUserState(fetchedUser);
      return fetchedUser;
    } catch (err) {
      if (isApiError(err) && (err.status === 401 || err.status === 403)) {
        setUserState(null);
        clearAdminToken();
        return null;
      }
      throw err;
    }
  }, [clearAdminToken]);

  const mintAdminToken = useCallback(async (): Promise<string> => {
    if (inflightTokenPromiseRef.current) {
      return inflightTokenPromiseRef.current;
    }

    const promise = (async () => {
      const res = await authApi.exchangeSsoToken({ app_id: AUTH_WEB_APP_ID });
      if (res.status !== "authenticated") {
        clearLocalSession();
        throw new Error("Your session has expired. Please sign in again.");
      }

      const expiresAtMs = Date.now() + res.expires_in * 1000;
      adminTokenRef.current = {
        token: res.token,
        expiresAtMs,
      };
      setUserState(res.user);

      // Schedule silent refresh ~60s before expiry
      clearRefreshTimer();
      const delayMs = Math.max(
        5_000,
        res.expires_in * 1000 - TOKEN_REFRESH_BUFFER_MS
      );
      refreshTimerRef.current = window.setTimeout(() => {
        mintAdminToken().catch(() => {
          // Silent background refresh failed; next foreground call will handle it.
        });
      }, delayMs);

      return res.token;
    })();

    inflightTokenPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      inflightTokenPromiseRef.current = null;
    }
  }, [clearLocalSession, clearRefreshTimer]);

  const getAdminToken = useCallback(async (): Promise<string> => {
    const cached = adminTokenRef.current;
    if (cached && cached.expiresAtMs - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
      return cached.token;
    }
    return mintAdminToken();
  }, [mintAdminToken]);

  const signOut = useCallback(async () => {
    try {
      await authApi.logoutSso();
    } catch {
      // Clear local state regardless of network failure
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  // Initial session hydration on mount
  useEffect(() => {
    const controller = new AbortController();
    authApi
      .getMe(controller.signal)
      .then(({ user: fetchedUser }) => {
        setUserState(fetchedUser);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setUserState(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  // Throttled Global Single Logout check on tab focus
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastVisibilityCheckRef.current < VISIBILITY_CHECK_THROTTLE_MS) {
        return;
      }
      lastVisibilityCheckRef.current = now;
      refreshUser().catch(() => {
        // Ignore transient network errors on background check
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, refreshUser]);

  const isAdmin = useMemo(() => isUserAdmin(user), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAdmin,
      setUser,
      refreshUser,
      getAdminToken,
      signOut,
      clearLocalSession,
    }),
    [
      user,
      isLoading,
      isAdmin,
      setUser,
      refreshUser,
      getAdminToken,
      signOut,
      clearLocalSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
