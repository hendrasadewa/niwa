import {
  ApiError,
  createApiClient,
  formatApiErrorMessage,
  type RequestOptions,
} from "@niwa/api-client";
import type { Store, User } from "@/types/api";
import { openPoSsoClient } from "./sso";

export { ApiError, formatApiErrorMessage, type RequestOptions };

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8789";

export const ACTIVE_STORE_STORAGE_KEY = "open_po_active_store_id";

const LEGACY_STORAGE_KEYS = [
  "open_po_auth_token",
  "open_po_refresh_token",
  "open_po_auth_user",
  "open_po_owned_stores",
  ACTIVE_STORE_STORAGE_KEY,
] as const;

const LEGACY_COOKIES = ["open_po_token", "open_po_roles"] as const;

let inMemoryUser: User | null = null;
let inMemoryStores: Store[] = [];

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => openPoSsoClient.getAccessToken(),
  refreshAccessToken: () => openPoSsoClient.refreshAccessToken(),
});

export function setOnUnauthorizedHandler(handler: (() => void) | null) {
  apiClient.setOnUnauthorizedHandler(handler);
}

export function getAuthToken(): string | null {
  return openPoSsoClient.getAccessToken();
}

export function setAuthToken(token: string): void {
  openPoSsoClient.setAccessToken(token);
}

export function getStoredUser(): User | null {
  return inMemoryUser;
}

export function setStoredUser(user: User): void {
  inMemoryUser = user;
}

export function getStoredOwnedStores(): Store[] {
  return inMemoryStores;
}

export function setStoredOwnedStores(stores: Store[]): void {
  inMemoryStores = stores;
}

export function clearAuthToken(): void {
  openPoSsoClient.clearAccessToken();
  inMemoryUser = null;
  inMemoryStores = [];
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

export function getStoreLogoUrl(
  storeIdOrSlug: string,
  cacheBuster?: string | number | null
): string {
  const base = `${API_BASE_URL}/api/v1/stores/${encodeURIComponent(storeIdOrSlug)}/logo`;
  return cacheBuster ? `${base}?v=${encodeURIComponent(String(cacheBuster))}` : base;
}

export function getProductImageUrl(
  productId: string,
  cacheBuster?: string | number | null
): string {
  const base = `${API_BASE_URL}/api/v1/products/${encodeURIComponent(productId)}/image`;
  return cacheBuster ? `${base}?v=${encodeURIComponent(String(cacheBuster))}` : base;
}

export function getOrderReceiptUrl(
  orderId: string,
  cacheBuster?: string | number | null
): string {
  const base = `${API_BASE_URL}/api/v1/orders/${encodeURIComponent(orderId)}/receipt`;
  const params = new URLSearchParams();
  if (cacheBuster) {
    params.set("v", String(cacheBuster));
  }
  const token = getAuthToken();
  if (token) {
    params.set("token", token);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
