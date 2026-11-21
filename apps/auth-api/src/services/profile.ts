import { AuthErrors } from "../errors/auth";
import type { RoleRepo } from "../repositories/roles";
import type { UserRepo } from "../repositories/users";
import type { AuthUserResponse } from "../types/auth";
import { signNiwaToken, type JwtSigningConfig } from "../utils/jwt";
import { isUserAdmin } from "../utils/rbac";

export type ProfileServiceConfig = {
  jwtSigning: JwtSigningConfig;
  accessTokenTtl: number;
};

export type ProfileServiceDeps = {
  userRepo: UserRepo;
  roleRepo: RoleRepo;
  ensureSeeded: () => Promise<void>;
  config: ProfileServiceConfig;
};

export function createProfileService({
  userRepo,
  roleRepo,
  ensureSeeded,
  config,
}: ProfileServiceDeps) {
  return {
    async updateProfile(input: {
      currentUser: AuthUserResponse;
      name?: string;
      whatsapp_number?: string;
    }): Promise<{ user: AuthUserResponse; token: string; expires_in: number }> {
      const now = Math.floor(Date.now() / 1000);
      const nextName = input.name ?? input.currentUser.name;
      const nextWhatsapp =
        input.whatsapp_number ?? input.currentUser.whatsapp_number;

      await userRepo.updateProfile(input.currentUser.id, {
        name: nextName,
        whatsapp_number: nextWhatsapp,
        updated_at: now,
      });

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(input.currentUser.id);

      const updatedUser: AuthUserResponse = {
        ...input.currentUser,
        name: nextName,
        whatsapp_number: nextWhatsapp,
        app_roles,
        app_permissions,
        updated_at: now,
      };

      const token = await signNiwaToken(updatedUser, config.jwtSigning, {
        ttlSeconds: config.accessTokenTtl,
      });

      return {
        user: updatedUser,
        token,
        expires_in: config.accessTokenTtl,
      };
    },

    async grantRole(input: {
      caller: AuthUserResponse;
      app_id: string;
      role: string;
      user_id?: string;
    }): Promise<{ user: AuthUserResponse; token: string; expires_in: number }> {
      await ensureSeeded();

      const targetUserId = input.user_id ?? input.caller.id;
      const callerIsAdmin = isUserAdmin(input.caller, input.app_id);

      if (
        (targetUserId !== input.caller.id || input.role === "admin") &&
        !callerIsAdmin
      ) {
        throw AuthErrors.adminRequiredForGrant();
      }

      const targetRole = await roleRepo.findByAppAndName(
        input.app_id,
        input.role
      );
      if (!targetRole) {
        throw AuthErrors.roleNotFoundForApp(input.app_id, input.role);
      }

      const targetUser = await userRepo.findById(targetUserId);
      if (!targetUser || !targetUser.is_active) {
        throw AuthErrors.targetUserNotFound("Target user not found or inactive");
      }

      await roleRepo.assignUserAppRoles([
        {
          user_id: targetUser.id,
          app_id: targetRole.app_id,
          role_id: targetRole.id,
        },
      ]);

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(targetUser.id);

      const updatedUser: AuthUserResponse = {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        whatsapp_number: targetUser.whatsapp_number,
        is_active: targetUser.is_active,
        email_verified_at: targetUser.email_verified_at ?? null,
        app_roles,
        app_permissions,
        created_at: targetUser.created_at,
        updated_at: targetUser.updated_at,
      };

      const token = await signNiwaToken(updatedUser, config.jwtSigning, {
        ttlSeconds: config.accessTokenTtl,
      });

      return {
        user: updatedUser,
        token,
        expires_in: config.accessTokenTtl,
      };
    },

    async revokeRole(input: {
      caller: AuthUserResponse;
      app_id: string;
      role: string;
      user_id: string;
    }): Promise<{ user: AuthUserResponse }> {
      await ensureSeeded();

      if (!isUserAdmin(input.caller, input.app_id)) {
        throw AuthErrors.adminRequiredForRevoke();
      }

      if (input.user_id === input.caller.id && input.role === "admin") {
        throw AuthErrors.cannotRevokeOwnAdmin();
      }

      const targetRole = await roleRepo.findByAppAndName(
        input.app_id,
        input.role
      );
      if (!targetRole) {
        throw AuthErrors.roleNotFoundForApp(input.app_id, input.role);
      }

      const targetUser = await userRepo.findById(input.user_id);
      if (!targetUser) {
        throw AuthErrors.targetUserNotFound();
      }

      await roleRepo.revokeUserAppRole(
        targetUser.id,
        targetRole.app_id,
        targetRole.id
      );

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(targetUser.id);

      return {
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          whatsapp_number: targetUser.whatsapp_number,
          is_active: targetUser.is_active,
          email_verified_at: targetUser.email_verified_at ?? null,
          app_roles,
          app_permissions,
          created_at: targetUser.created_at,
          updated_at: targetUser.updated_at,
        },
      };
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
