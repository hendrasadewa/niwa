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

const LEGACY_STORAGE_KEYS = [
  "pustaka_auth_token",
  "pustaka_refresh_token",
  "pustaka_auth_user",
] as const;

const LEGACY_COOKIES = ["pustaka_token", "pustaka_roles"] as const;

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
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    for (const cookie of LEGACY_COOKIES) {
      document.cookie = `${cookie}=; path=/; max-age=0; SameSite=Lax`;
    }
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
