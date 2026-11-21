import { AuthErrors } from "../errors/auth";
import type { AuthApiRepo } from "../repositories/auth-api";
import type { CustomerProfileRepo } from "../repositories/customer-profiles";
import type { StoreRepo } from "../repositories/stores";
import type {
  AuthApiResponsePayload,
  AuthUser,
  OpenPoAuthTokenResponse,
} from "../types/auth";
import { mapAuthApiUserToOpenPoUser, OPEN_PO_APP_ID } from "../utils/auth";

export type AuthServiceDeps = {
  authApiRepo: AuthApiRepo;
  customerProfileRepo: CustomerProfileRepo;
  storeRepo: StoreRepo;
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

export function createAuthService({
  authApiRepo,
  customerProfileRepo,
  storeRepo,
}: AuthServiceDeps) {
  return {
    async register(input: {
      email: string;
      password: string;
      name: string;
      whatsapp_number: string;
      default_shipping_address?: string | null;
      role?: string;
      userAgent?: string | null;
    }): Promise<OpenPoAuthTokenResponse> {
      const res = await authApiRepo.request("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(input.userAgent ? { "User-Agent": input.userAgent } : {}),
        },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          name: input.name,
          whatsapp_number: input.whatsapp_number,
          app_id: OPEN_PO_APP_ID,
          role: input.role,
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

      const shippingAddress = input.default_shipping_address ?? null;
      if (shippingAddress !== null) {
        await customerProfileRepo.upsertShippingAddress(
          res.data.user.id,
          shippingAddress,
          Math.floor(Date.now() / 1000)
        );
      }

      return {
        user: mapAuthApiUserToOpenPoUser(res.data.user, shippingAddress),
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
    }): Promise<OpenPoAuthTokenResponse> {
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

      const shippingAddress = await customerProfileRepo.findShippingAddress(
        res.data.user.id
      );

      return {
        user: mapAuthApiUserToOpenPoUser(res.data.user, shippingAddress),
        token: res.data.token,
        ...(res.data.refresh_token
          ? { refresh_token: res.data.refresh_token }
          : {}),
        ...(res.data.expires_in !== undefined
          ? { expires_in: res.data.expires_in }
          : {}),
      };
    },

    async refresh(input: {
      refresh_token: string;
      userAgent?: string | null;
    }): Promise<OpenPoAuthTokenResponse> {
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

      const shippingAddress = await customerProfileRepo.findShippingAddress(
        res.data.user.id
      );

      return {
        user: mapAuthApiUserToOpenPoUser(res.data.user, shippingAddress),
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
        headers: { Authorization: `Bearer ${authToken}` },
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
      user: AuthUser;
      authToken: string;
      payload: {
        current_password: string;
        new_password: string;
        revoke_other_sessions?: boolean;
      };
      userAgent?: string | null;
    }): Promise<OpenPoAuthTokenResponse & { message: string }> {
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
        user: mapAuthApiUserToOpenPoUser(
          res.data.user,
          input.user.default_shipping_address
        ),
        token: res.data.token,
        ...(res.data.refresh_token
          ? { refresh_token: res.data.refresh_token }
          : {}),
        ...(res.data.expires_in !== undefined
          ? { expires_in: res.data.expires_in }
          : {}),
      };
    },

    async getProfileWithStores(user: AuthUser) {
      const ownedStores = await storeRepo.findByOwnerId(user.id);
      return { user, stores: ownedStores };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
