import { AuthErrors } from "../errors/auth";
import type { AuthApiResponsePayload } from "../types/auth";

const DEFAULT_AUTH_API_URL = "http://127.0.0.1:8788";

export type AuthApiRepoConfig = {
  authApi?: Fetcher;
  authApiUrl?: string;
};

export type AuthApiCallResult = {
  ok: boolean;
  status: number;
  data: AuthApiResponsePayload | null;
};

export function createAuthApiRepo({ authApi, authApiUrl }: AuthApiRepoConfig) {
  async function request(
    path: string,
    init?: RequestInit
  ): Promise<AuthApiCallResult> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    let response: Response;
    try {
      if (authApi) {
        try {
          const req = new Request(
            `https://niwa-auth-api.internal${normalizedPath}`,
            init
          );
          response = await authApi.fetch(req);
        } catch (err) {
          if (!authApiUrl) {
            throw err;
          }
          const baseUrl = authApiUrl.replace(/\/+$/, "");
          response = await fetch(`${baseUrl}${normalizedPath}`, init);
        }
      } else {
        const baseUrl = (authApiUrl || DEFAULT_AUTH_API_URL).replace(
          /\/+$/,
          ""
        );
        response = await fetch(`${baseUrl}${normalizedPath}`, init);
      }
    } catch {
      throw AuthErrors.serviceUnreachable();
    }

    const data = (await response
      .json()
      .catch(() => null)) as AuthApiResponsePayload | null;

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }

  return { request };
}

export type AuthApiRepo = ReturnType<typeof createAuthApiRepo>;
