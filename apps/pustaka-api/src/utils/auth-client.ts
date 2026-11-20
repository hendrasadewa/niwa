import type { AuthUser, Bindings, RoleName } from "../types";

export const PUSTAKA_APP_ID = "pustaka";
const DEFAULT_AUTH_API_URL = "http://127.0.0.1:8788";

export type AuthApiUser = {
  id: string;
  email: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  app_roles: Record<string, string[]>;
  app_permissions: Record<string, string[]>;
  created_at: number;
  updated_at: number;
};

export type AuthApiResponsePayload = {
  user?: AuthApiUser;
  users?: AuthApiUser[];
  total?: number;
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  revoked_sessions?: number;
  code?: string;
  error?: string;
  message?: string;
};

/**
 * Calls `@niwa/auth-api` via Cloudflare Service Binding (`AUTH_API`) when bound,
 * falling back to `AUTH_API_URL` (default `http://127.0.0.1:8788`) for local dev.
 */
export async function fetchAuthApi(
  env: Bindings,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (env.AUTH_API) {
    try {
      const request = new Request(
        `https://niwa-auth-api.internal${normalizedPath}`,
        init
      );
      return await env.AUTH_API.fetch(request);
    } catch (err) {
      if (!env.AUTH_API_URL) {
        throw err;
      }
    }
  }

  const baseUrl = (env.AUTH_API_URL || DEFAULT_AUTH_API_URL).replace(
    /\/+$/,
    ""
  );
  return fetch(`${baseUrl}${normalizedPath}`, init);
}

export function mapAuthApiUserToPustakaUser(authUser: AuthApiUser): AuthUser {
  return {
    id: authUser.id,
    username: authUser.name,
    email: authUser.email,
    roles: (authUser.app_roles?.[PUSTAKA_APP_ID] ?? []) as RoleName[],
    permissions: authUser.app_permissions?.[PUSTAKA_APP_ID] ?? [],
    created_at: authUser.created_at,
  };
}
