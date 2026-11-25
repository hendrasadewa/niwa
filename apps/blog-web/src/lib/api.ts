import {
  ApiError,
  createApiClient,
  type RequestOptions,
} from "@niwa/api-client";
import { blogSsoClient } from "./sso";

export { ApiError, type RequestOptions };

export function formatApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred";
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8791";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://blog.hendrasadewa.com";

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => blogSsoClient.getAccessToken(),
  refreshAccessToken: () => blogSsoClient.refreshAccessToken(),
});

export function setOnUnauthorizedHandler(handler: (() => void) | null) {
  apiClient.setOnUnauthorizedHandler(handler);
}

export function getAuthToken(): string | null {
  return blogSsoClient.getAccessToken();
}

export function clearAuthToken(): void {
  blogSsoClient.clearAccessToken();
}

export async function uploadStudioFile<T>(
  endpoint: "/api/v1/studio/media" | "/api/v1/studio/cover",
  file: File
): Promise<T> {
  const token = blogSsoClient.getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    let message = `Upload failed (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore non-JSON errors
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}
