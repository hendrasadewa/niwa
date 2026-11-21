import { AuthErrors } from "../errors/auth";
import type { AuthApiRepo } from "../repositories/auth-api";
import type { AuthUser, RoleName } from "../types/auth";
import { mapAuthApiUserToPustakaUser, PUSTAKA_APP_ID } from "../utils/auth";

export type UserServiceDeps = {
  authApiRepo: AuthApiRepo;
};

export function createUserService({ authApiRepo }: UserServiceDeps) {
  return {
    async listUsers(input: {
      authToken: string;
      search?: string;
    }): Promise<{ total: number; users: AuthUser[] }> {
      const query = new URLSearchParams();
      if (input.search) {
        query.set("search", input.search);
      }
      const qs = query.toString();
      const path = qs ? `/api/v1/acl/users?${qs}` : "/api/v1/acl/users";

      const res = await authApiRepo.request(path, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${input.authToken}`,
        },
      });

      if (!res.ok || !res.data?.users) {
        throw AuthErrors.upstream({
          status: res.status,
          error: res.data?.error ?? "AuthError",
          code: res.data?.code,
          message:
            res.data?.message ??
            "Failed to list users from authentication service",
          details: res.data?.details,
        });
      }

      return {
        total: res.data.users.length,
        users: res.data.users.map(mapAuthApiUserToPustakaUser),
      };
    },

    async assignRole(input: {
      authToken: string;
      targetUserId: string;
      role: RoleName;
    }): Promise<AuthUser> {
      // Promote to ["member", "admin"] or set to ["member"] via auth-api ACL bulk-set endpoint
      const nextRoles = input.role === "admin" ? ["member", "admin"] : ["member"];

      const res = await authApiRepo.request(
        `/api/v1/acl/users/${encodeURIComponent(input.targetUserId)}/roles`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.authToken}`,
          },
          body: JSON.stringify({
            app_id: PUSTAKA_APP_ID,
            roles: nextRoles,
          }),
        }
      );

      if (!res.ok || !res.data?.user) {
        throw AuthErrors.upstream({
          status: res.status,
          error: res.data?.error ?? "AuthError",
          code: res.data?.code,
          message:
            res.data?.message ??
            "Failed to update user roles in authentication service",
          details: res.data?.details,
        });
      }

      return mapAuthApiUserToPustakaUser(res.data.user);
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
