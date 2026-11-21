import {
  ApiError,
  createApiClient,
  formatApiErrorMessage,
  type RequestOptions,
} from "@niwa/api-client";
import type { User } from "@/types/api";
import { pustakaSsoClient } from "./sso";

export { ApiError, formatApiErrorMessage, type RequestOptions };

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8787";

export const TOKEN_STORAGE_KEY = "pustaka_auth_token";
export const REFRESH_TOKEN_STORAGE_KEY = "pustaka_refresh_token";
export const USER_STORAGE_KEY = "pustaka_auth_user";
export const TOKEN_COOKIE_NAME = "pustaka_token";
export const ROLES_COOKIE_NAME = "pustaka_roles";

let inMemoryUser: User | null = null;

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => pustakaSsoClient.getAccessToken(),
  refreshAccessToken: () => pustakaSsoClient.refreshAccessToken(),
});

export function setOnUnauthorizedHandler(handler: (() => void) | null) {
  apiClient.setOnUnauthorizedHandler(handler);
}

export function getAuthToken(): string | null {
  return pustakaSsoClient.getAccessToken();
}

export function setAuthToken(token: string): void {
  pustakaSsoClient.setAccessToken(token);
}

export function setRefreshToken(_refreshToken: string): void {
  // Refresh is handled by the HttpOnly __Host-niwa_session cookie on auth-api
}

export function getStoredUser(): User | null {
  return inMemoryUser;
}

export function setStoredUser(user: User): void {
  inMemoryUser = user;
}

export function clearAuthToken(): void {
  pustakaSsoClient.clearAccessToken();
  inMemoryUser = null;
  if (typeof window === "undefined") return;
  try {
    // Clean up any legacy localStorage/cookie artifacts from pre-SSO sessions
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${ROLES_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // ignore storage errors
  }
}

export function getBookCoverUrl(
  bookId: string,
  cacheBuster?: string | number | null
): string {
  const base = `${API_BASE_URL}/api/v1/books/${encodeURIComponent(bookId)}/cover`;
  return cacheBuster ? `${base}?v=${encodeURIComponent(String(cacheBuster))}` : base;
}
