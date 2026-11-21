import type { User } from "@/types/api";
import { exchangeSsoToken } from "./sso";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8787";

export const TOKEN_STORAGE_KEY = "pustaka_auth_token";
export const REFRESH_TOKEN_STORAGE_KEY = "pustaka_refresh_token";
export const USER_STORAGE_KEY = "pustaka_auth_user";
export const TOKEN_COOKIE_NAME = "pustaka_token";
export const ROLES_COOKIE_NAME = "pustaka_roles";

// Access JWT is stored strictly in-memory (never persisted to localStorage)
let inMemoryToken: string | null = null;
let inMemoryUser: User | null = null;

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    message: string,
    code = "ApiError",
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setOnUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export function setAuthToken(token: string): void {
  inMemoryToken = token;
}

export function getRefreshToken(): string | null {
  return null;
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
  inMemoryToken = null;
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

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuthRedirect?: boolean;
}

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const normalizedPath = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (!params) return normalizedPath;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}

export function formatApiErrorMessage(
  payload: Record<string, unknown> | null,
  status: number
): string {
  if (!payload) {
    return `Request failed with status ${status}`;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  // Handle Hono @hono/zod-validator error shape: { success: false, error: { issues: [...] } }
  const zodError = payload.error as
    | { issues?: Array<{ path?: Array<string | number>; message?: string }> }
    | string
    | undefined;

  if (
    zodError &&
    typeof zodError === "object" &&
    Array.isArray(zodError.issues) &&
    zodError.issues.length > 0
  ) {
    return zodError.issues
      .map((issue) => {
        const field = issue.path?.join(".");
        return field ? `${field}: ${issue.message}` : issue.message;
      })
      .filter(Boolean)
      .join("; ");
  }

  if (typeof zodError === "string" && zodError.trim()) {
    return zodError;
  }

  return `Request failed with status ${status}`;
}

let inFlightRefreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  inFlightRefreshPromise = (async () => {
    try {
      const redirectUri =
        typeof window !== "undefined" ? window.location.href : undefined;
      const result = await exchangeSsoToken(redirectUri);

      if (result.status === "authenticated") {
        setAuthToken(result.token);
        return result.token;
      }

      if (
        result.status === "consent_required" &&
        typeof window !== "undefined"
      ) {
        window.location.replace(result.consent_url);
      }

      return null;
    } catch {
      return null;
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

const NON_REFRESHABLE_AUTH_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/auth/password",
];

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  hasRetried = false
): Promise<T> {
  const { body, params, headers: customHeaders, skipAuthRedirect, ...rest } =
    options;

  const url = buildUrl(endpoint, params);
  const headers = new Headers(customHeaders);

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let serializedBody: BodyInit | undefined;
  if (body instanceof FormData || body instanceof Blob) {
    serializedBody = body;
  } else if (body !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    serializedBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body: serializedBody,
  });

  const canAttemptRefresh =
    response.status === 401 &&
    !hasRetried &&
    !NON_REFRESHABLE_AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p)) &&
    Boolean(getRefreshToken());

  if (canAttemptRefresh) {
    const newAccessToken = await attemptTokenRefresh();
    if (newAccessToken) {
      const retryHeaders = new Headers(customHeaders);
      retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
      return request<T>(
        endpoint,
        { ...options, headers: retryHeaders },
        true
      );
    }
  }

  if (response.status === 401 && !skipAuthRedirect && unauthorizedHandler) {
    unauthorizedHandler();
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson
    ? ((await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null)
    : null;

  if (!response.ok) {
    const errorMessage = formatApiErrorMessage(payload, response.status);
    const errorCode =
      (payload && typeof payload.error === "string" && payload.error) ||
      (response.status === 400
        ? "BadRequest"
        : response.status === 401
          ? "Unauthorized"
          : response.status === 403
            ? "Forbidden"
            : "HttpError");

    throw new ApiError(
      response.status,
      errorMessage,
      errorCode,
      payload?.details ?? payload
    );
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(endpoint, { ...options, method: "DELETE" }),

  upload: <T>(
    endpoint: string,
    formData: FormData,
    method: "PUT" | "POST" = "PUT",
    options?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(endpoint, { ...options, method, body: formData }),
};

export function getBookCoverUrl(
  bookId: string,
  cacheBuster?: string | number | null
): string {
  const base = `${API_BASE_URL}/api/v1/books/${encodeURIComponent(bookId)}/cover`;
  return cacheBuster ? `${base}?v=${encodeURIComponent(String(cacheBuster))}` : base;
}
