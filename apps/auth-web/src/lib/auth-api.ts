import type {
  ChangePasswordInput,
  CreateAppInput,
  CreatePermissionInput,
  CreateRoleInput,
  LoginInput,
  RegisterInput,
  SetUserAppRolesInput,
  SsoConsentInput,
  SsoTokenInput,
  UpdateAppInput,
  UpdateRolePermissionsInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "@niwa/auth-validators";

export type AppRoleMap = Record<string, string[]>;
export type AppPermissionMap = Record<string, string[]>;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  app_roles: AppRoleMap;
  app_permissions: AppPermissionMap;
  created_at: number;
  updated_at: number;
}

export interface AuthTokenResponse {
  user: AuthUser;
  token: string;
  refresh_token: string;
  expires_in: number;
}

export interface SsoAppMetadata {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  default_role_name: string | null;
  require_consent: boolean;
}

export type SsoTokenResponse =
  | {
      status: "authenticated";
      token: string;
      expires_in: number;
      user: AuthUser;
    }
  | {
      status: "consent_required";
      app: SsoAppMetadata;
      consent_url: string;
    }
  | {
      status: "unauthenticated";
    };

export interface SsoConsentResponse {
  approved: boolean;
  app_id: string;
  redirect_uri?: string;
}

export interface AccountSession {
  id: string;
  user_id: string;
  amr: string[];
  ip_address: string | null;
  user_agent: string | null;
  last_seen_at: number;
  expires_at: number;
  created_at: number;
  is_current: boolean;
}

export interface ConnectedApp {
  app_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  granted_scopes: string[];
  roles: string[];
  consented_at: number;
}

export interface PermissionRecord {
  id: string;
  app_id: string;
  slug: string;
  description: string;
}

export interface RoleWithPermissions {
  id: string;
  app_id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface AppWithRbac {
  id: string;
  name: string;
  description: string;
  allowed_origins: string[];
  allowed_redirect_uris: string[];
  default_role_name: string | null;
  require_consent: boolean;
  icon_url: string | null;
  roles: RoleWithPermissions[];
  permissions: PermissionRecord[];
}

export interface ApiErrorPayload {
  error: string;
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || payload.error || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.error = payload.error;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (isApiError(err)) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function extractApiFieldErrors(err: unknown): Record<string, string> {
  if (!isApiError(err) || !err.details || typeof err.details !== "object") {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  const details = err.details as Record<string, unknown>;

  // Handle Zod flatten-style details: { fieldErrors: { field: ["msg"] } } or { field: ["msg"] }
  const source =
    details.fieldErrors && typeof details.fieldErrors === "object"
      ? (details.fieldErrors as Record<string, unknown>)
      : details;

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      fieldErrors[key] = value[0];
    } else if (typeof value === "string") {
      fieldErrors[key] = value;
    }
  }

  return fieldErrors;
}

const RAW_API_URL =
  import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8788";
export const AUTH_API_URL = RAW_API_URL.replace(/\/+$/, "");

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token, signal } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Niwa-Requested-With": "fetch",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    credentials: "include",
    headers,
    signal,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${AUTH_API_URL}${path}`, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new ApiError(0, {
      error: "NetworkError",
      code: "NETWORK_ERROR",
      message: `Unable to reach authentication service (${AUTH_API_URL}).`,
    });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const payload: ApiErrorPayload =
      data && typeof data === "object" && "message" in data
        ? {
            error: String((data as Record<string, unknown>).error ?? "Error"),
            code: String(
              (data as Record<string, unknown>).code ?? "UNKNOWN_ERROR"
            ),
            message: String((data as Record<string, unknown>).message),
            details: (data as Record<string, unknown>).details,
          }
        : {
            error: response.statusText || "RequestFailed",
            code: `HTTP_${response.status}`,
            message: `Request failed with status ${response.status}.`,
          };
    throw new ApiError(response.status, payload);
  }

  return data as T;
}

export const authApi = {
  // Public Auth
  login(input: LoginInput) {
    return request<AuthTokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: input,
    });
  },

  register(input: RegisterInput) {
    return request<AuthTokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: input,
    });
  },

  // SSO
  exchangeSsoToken(input: SsoTokenInput, signal?: AbortSignal) {
    return request<SsoTokenResponse>("/api/v1/sso/token", {
      method: "POST",
      body: input,
      signal,
    });
  },

  submitSsoConsent(input: SsoConsentInput) {
    return request<SsoConsentResponse>("/api/v1/sso/consent", {
      method: "POST",
      body: input,
    });
  },

  logoutSso() {
    return request<{ message: string }>("/api/v1/sso/logout", {
      method: "POST",
    });
  },

  // Account & Security (cookie-authenticated)
  getMe(signal?: AbortSignal) {
    return request<{ user: AuthUser }>("/api/v1/account/me", {
      method: "GET",
      signal,
    });
  },

  updateMe(input: UpdateUserInput) {
    return request<{ user: AuthUser }>("/api/v1/account/me", {
      method: "PUT",
      body: input,
    });
  },

  changePassword(input: ChangePasswordInput) {
    return request<{ message: string; revoked_sessions: number }>(
      "/api/v1/account/password",
      {
        method: "PUT",
        body: input,
      }
    );
  },

  listSessions(signal?: AbortSignal) {
    return request<{ sessions: AccountSession[] }>("/api/v1/account/sessions", {
      method: "GET",
      signal,
    });
  },

  revokeSession(sessionId: string) {
    return request<{ message: string }>(
      `/api/v1/account/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
      }
    );
  },

  revokeAllSessions() {
    return request<{ message: string; revoked_sessions: number }>(
      "/api/v1/account/sessions/revoke-all",
      {
        method: "POST",
      }
    );
  },

  listConnectedApps(signal?: AbortSignal) {
    return request<{ apps: ConnectedApp[] }>("/api/v1/account/apps", {
      method: "GET",
      signal,
    });
  },

  revokeAppConsent(appId: string) {
    return request<{ message: string; app_id: string }>(
      `/api/v1/account/apps/${encodeURIComponent(appId)}`,
      {
        method: "DELETE",
      }
    );
  },

  // Admin ACL (ES256 Bearer token authenticated)
  listApps(token: string, appId?: string) {
    const qs = appId ? `?app_id=${encodeURIComponent(appId)}` : "";
    return request<{ apps: AppWithRbac[] }>(`/api/v1/acl/apps${qs}`, {
      method: "GET",
      token,
    });
  },

  createApp(token: string, input: CreateAppInput) {
    return request<{ app: AppWithRbac }>("/api/v1/acl/apps", {
      method: "POST",
      body: input,
      token,
    });
  },

  updateApp(token: string, appId: string, input: UpdateAppInput) {
    return request<{ app: AppWithRbac }>(
      `/api/v1/acl/apps/${encodeURIComponent(appId)}`,
      {
        method: "PUT",
        body: input,
        token,
      }
    );
  },

  listRoles(token: string, appId?: string) {
    const qs = appId ? `?app_id=${encodeURIComponent(appId)}` : "";
    return request<{ roles: RoleWithPermissions[] }>(`/api/v1/acl/roles${qs}`, {
      method: "GET",
      token,
    });
  },

  createRole(token: string, input: CreateRoleInput) {
    return request<{ role: RoleWithPermissions }>("/api/v1/acl/roles", {
      method: "POST",
      body: input,
      token,
    });
  },

  updateRolePermissions(
    token: string,
    roleId: string,
    input: UpdateRolePermissionsInput
  ) {
    return request<{ role: RoleWithPermissions }>(
      `/api/v1/acl/roles/${encodeURIComponent(roleId)}/permissions`,
      {
        method: "PUT",
        body: input,
        token,
      }
    );
  },

  deleteRole(token: string, roleId: string) {
    return request<{ message: string; id: string }>(
      `/api/v1/acl/roles/${encodeURIComponent(roleId)}`,
      {
        method: "DELETE",
        token,
      }
    );
  },

  listPermissions(token: string, appId?: string) {
    const qs = appId ? `?app_id=${encodeURIComponent(appId)}` : "";
    return request<{ permissions: PermissionRecord[] }>(
      `/api/v1/acl/permissions${qs}`,
      {
        method: "GET",
        token,
      }
    );
  },

  createPermission(token: string, input: CreatePermissionInput) {
    return request<{ permission: PermissionRecord }>("/api/v1/acl/permissions", {
      method: "POST",
      body: input,
      token,
    });
  },

  deletePermission(token: string, permissionId: string) {
    return request<{ message: string; id: string }>(
      `/api/v1/acl/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: "DELETE",
        token,
      }
    );
  },

  listUsers(
    token: string,
    filters?: {
      search?: string;
      app_id?: string;
      role?: string;
      is_active?: "true" | "false";
    }
  ) {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.set("search", filters.search.trim());
    if (filters?.app_id) params.set("app_id", filters.app_id);
    if (filters?.role) params.set("role", filters.role);
    if (filters?.is_active) params.set("is_active", filters.is_active);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<{ total: number; users: AuthUser[] }>(
      `/api/v1/acl/users${qs}`,
      {
        method: "GET",
        token,
      }
    );
  },

  updateUserStatus(
    token: string,
    userId: string,
    input: UpdateUserStatusInput
  ) {
    return request<{ user: AuthUser; revoked_sessions: number }>(
      `/api/v1/acl/users/${encodeURIComponent(userId)}/status`,
      {
        method: "PATCH",
        body: input,
        token,
      }
    );
  },

  setUserAppRoles(
    token: string,
    userId: string,
    input: SetUserAppRolesInput
  ) {
    return request<{ user: AuthUser }>(
      `/api/v1/acl/users/${encodeURIComponent(userId)}/roles`,
      {
        method: "PUT",
        body: input,
        token,
      }
    );
  },
};
