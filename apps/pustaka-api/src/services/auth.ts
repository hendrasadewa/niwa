import { AuthErrors } from "../errors/auth";
import type { AuthApiRepo } from "../repositories/auth-api";
import type {
  AuthApiResponsePayload,
  PustakaAuthTokenResponse,
} from "../types/auth";
import { mapAuthApiUserToPustakaUser, PUSTAKA_APP_ID } from "../utils/auth";

export type AuthServiceDeps = {
  authApiRepo: AuthApiRepo;
};

function throwUpstreamAuthError(
  status: number,
  data: AuthApiResponsePayload | null,
  fallbackError: string,
  fallbackMessage: string
): never {
  throw AuthErrors.upstream({
    status,
    error: data?.error ?? fallbackError,
    code: data?.code,
    message: data?.message ?? fallbackMessage,
    details: data?.details,
  });
}

export function createAuthService({ authApiRepo }: AuthServiceDeps) {
  return {
    async register(input: {
      username: string;
      email: string;
      password: string;
      userAgent?: string | null;
    }): Promise<PustakaAuthTokenResponse> {
      const res = await authApiRepo.request("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(input.userAgent ? { "User-Agent": input.userAgent } : {}),
        },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          name: input.username,
          app_id: PUSTAKA_APP_ID,
        }),
      });

      if (!res.ok || !res.data?.user || !res.data?.token) {
        throwUpstreamAuthError(
          res.status,
          res.data,
          "AuthError",
          "Registration failed in authentication service"
        );
      }

      return {
        user: mapAuthApiUserToPustakaUser(res.data.user),
        token: res.data.token,
        ...(res.data.refresh_token
          ? { refresh_token: res.data.refresh_token }
          : {}),
        ...(res.data.expires_in !== undefined
          ? { expires_in: res.data.expires_in }
          : {}),
      };
    },

    async login(input: {
      email: string;
      password: string;
      userAgent?: string | null;
    }): Promise<PustakaAuthTokenResponse> {
      const res = await authApiRepo.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(input.userAgent ? { "User-Agent": input.userAgent } : {}),
        },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
        }),
      });

      if (!res.ok || !res.data?.user || !res.data?.token) {
        throwUpstreamAuthError(
          res.status,
          res.data,
          "Unauthorized",
          "Invalid email or password"
        );
      }

      let resolvedAuthUser = res.data.user;
      let resolvedToken = res.data.token;
      let resolvedExpiresIn = res.data.expires_in;

      // SSO auto-enrollment: grant default Pustaka 'member' role for cross-app Niwa users
      const existingPustakaRoles = resolvedAuthUser.app_roles?.[PUSTAKA_APP_ID];
      if (!existingPustakaRoles || existingPustakaRoles.length === 0) {
        try {
          const grantRes = await authApiRepo.request(
            "/api/v1/auth/roles/grant",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resolvedToken}`,
              },
              body: JSON.stringify({
                app_id: PUSTAKA_APP_ID,
                role: "member",
              }),
            }
          );

          if (grantRes.ok && grantRes.data?.user && grantRes.data?.token) {
            resolvedAuthUser = grantRes.data.user;
            resolvedToken = grantRes.data.token;
            if (grantRes.data.expires_in !== undefined) {
              resolvedExpiresIn = grantRes.data.expires_in;
            }
          }
        } catch {
          // Proceed with login even if auto-enrollment temporarily fails
        }
      }

      return {
        user: mapAuthApiUserToPustakaUser(resolvedAuthUser),
        token: resolvedToken,
        ...(res.data.refresh_token
          ? { refresh_token: res.data.refresh_token }
          : {}),
        ...(resolvedExpiresIn !== undefined
          ? { expires_in: resolvedExpiresIn }
          : {}),
      };
    },

    async refresh(input: {
      refresh_token: string;
      userAgent?: string | null;
    }): Promise<PustakaAuthTokenResponse> {
      const res = await authApiRepo.request("/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(input.userAgent ? { "User-Agent": input.userAgent } : {}),
        },
        body: JSON.stringify({ refresh_token: input.refresh_token }),
      });

      if (!res.ok || !res.data?.user || !res.data?.token) {
        throwUpstreamAuthError(
          res.status,
          res.data,
          "Unauthorized",
          "Failed to refresh authentication token"
        );
      }

      return {
        user: mapAuthApiUserToPustakaUser(res.data.user),
        token: res.data.token,
        ...(res.data.refresh_token
          ? { refresh_token: res.data.refresh_token }
          : {}),
        ...(res.data.expires_in !== undefined
          ? { expires_in: res.data.expires_in }
          : {}),
      };
    },

    async logout(refresh_token?: string): Promise<AuthApiResponsePayload> {
      const res = await authApiRepo.request("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });

      if (!res.ok) {
        throwUpstreamAuthError(
          res.status,
          res.data,
          "AuthError",
          "Failed to logout in authentication service"
        );
      }

      return res.data ?? { message: "Logged out successfully" };
    },

    async logoutAll(authToken: string): Promise<AuthApiResponsePayload> {
      const res = await authApiRepo.request("/api/v1/auth/logout-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throwUpstreamAuthError(
          res.status,
          res.data,
          "AuthError",
          "Failed to logout from all sessions"
        );
      }

      return res.data ?? { message: "Logged out from all sessions" };
    },

    async changePassword(input: {
      authToken: string;
      payload: {
        current_password: string;
        new_password: string;
        revoke_other_sessions?: boolean;
      };
      userAgent?: string | null;
    }): Promise<PustakaAuthTokenResponse & { message: string }> {
      const res = await authApiRepo.request("/api/v1/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.authToken}`,
          ...(input.userAgent ? { "User-Agent": input.userAgent } : {}),
        },
        body: JSON.stringify(input.payload),
      });

      if (!res.ok || !res.data?.user || !res.data?.token) {
        throwUpstreamAuthError(
          res.status,
          res.data,
          "AuthError",
          "Failed to change password in authentication service"
        );
      }

      return {
        message: res.data.message ?? "Password updated successfully",
        user: mapAuthApiUserToPustakaUser(res.data.user),
        token: res.data.token,
        ...(res.data.refresh_token
          ? { refresh_token: res.data.refresh_token }
          : {}),
        ...(res.data.expires_in !== undefined
          ? { expires_in: res.data.expires_in }
          : {}),
      };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
