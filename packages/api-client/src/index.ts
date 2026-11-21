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

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuthRedirect?: boolean;
}

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  refreshAccessToken?: () => Promise<string | null>;
  nonRefreshableEndpoints?: ReadonlyArray<string>;
}

const DEFAULT_NON_REFRESHABLE_ENDPOINTS: ReadonlyArray<string> = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/auth/password",
];

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

export function createApiClient(config: ApiClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const nonRefreshable =
    config.nonRefreshableEndpoints ?? DEFAULT_NON_REFRESHABLE_ENDPOINTS;

  let unauthorizedHandler: (() => void) | null = null;

  function setOnUnauthorizedHandler(handler: (() => void) | null) {
    unauthorizedHandler = handler;
  }

  function buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): string {
    const normalizedPath = endpoint.startsWith("http")
      ? endpoint
      : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    if (!params) return normalizedPath;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
  }

  async function request<T>(
    endpoint: string,
    options: RequestOptions = {},
    hasRetried = false
  ): Promise<T> {
    const {
      body,
      params,
      headers: customHeaders,
      skipAuthRedirect,
      ...rest
    } = options;

    const url = buildUrl(endpoint, params);
    const headers = new Headers(customHeaders);

    const token = config.getAccessToken?.() ?? null;
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
      Boolean(config.refreshAccessToken) &&
      !nonRefreshable.some((p) => endpoint.startsWith(p));

    if (canAttemptRefresh && config.refreshAccessToken) {
      const newAccessToken = await config.refreshAccessToken();
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
              : response.status === 409
                ? "Conflict"
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

  return {
    request,
    setOnUnauthorizedHandler,

    get: <T>(
      endpoint: string,
      options?: Omit<RequestOptions, "method" | "body">
    ) => request<T>(endpoint, { ...options, method: "GET" }),

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
}

export type ApiClient = ReturnType<typeof createApiClient>;
