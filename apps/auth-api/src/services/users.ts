import { AclErrors } from "../errors/acl";
import type { AppRepo } from "../repositories/apps";
import type { RefreshTokenRepo } from "../repositories/refresh-tokens";
import type { RoleRepo } from "../repositories/roles";
import type { UserRecord, UserRepo } from "../repositories/users";
import type { AuthUserResponse, UserWithSessionCount } from "../types/auth";

export type UserServiceDeps = {
  userRepo: UserRepo;
  appRepo: AppRepo;
  roleRepo: RoleRepo;
  refreshTokenRepo: RefreshTokenRepo;
  ensureSeeded: () => Promise<void>;
};

export function createUserService({
  userRepo,
  appRepo,
  roleRepo,
  refreshTokenRepo,
  ensureSeeded,
}: UserServiceDeps) {
  async function hydrateUser(record: UserRecord): Promise<AuthUserResponse> {
    const { app_roles, app_permissions } =
      await roleRepo.getUserAppRolesAndPermissions(record.id);

    return {
      id: record.id,
      email: record.email,
      name: record.name,
      whatsapp_number: record.whatsapp_number,
      is_active: record.is_active,
      app_roles,
      app_permissions,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  return {
    async listUsers(filters: {
      search?: string;
      app_id?: string;
      role?: string;
      is_active?: boolean;
    }): Promise<{ total: number; users: AuthUserResponse[] }> {
      await ensureSeeded();

      const userRows = await userRepo.listFiltered({
        search: filters.search,
        isActive: filters.is_active,
      });

      const enriched = await Promise.all(userRows.map(hydrateUser));

      const filtered = enriched.filter((u) => {
        if (filters.app_id && filters.role) {
          return Boolean(u.app_roles[filters.app_id]?.includes(filters.role));
        }
        if (filters.app_id) {
          return Boolean(
            u.app_roles[filters.app_id] &&
              u.app_roles[filters.app_id]!.length > 0
          );
        }
        if (filters.role) {
          return Object.values(u.app_roles).some((list) =>
            list.includes(filters.role!)
          );
        }
        return true;
      });

      return {
        total: filtered.length,
        users: filtered,
      };
    },

    async getUser(userId: string): Promise<UserWithSessionCount> {
      const userRecord = await userRepo.findById(userId);
      if (!userRecord) {
        throw AclErrors.userNotFound();
      }

      const now = Math.floor(Date.now() / 1000);
      const [hydrated, activeSessionsCount] = await Promise.all([
        hydrateUser(userRecord),
        refreshTokenRepo.countActiveByUser(userRecord.id, now),
      ]);

      return {
        ...hydrated,
        active_sessions_count: activeSessionsCount,
      };
    },

    async updateStatus(input: {
      callerId: string;
      userId: string;
      is_active: boolean;
    }): Promise<{ user: AuthUserResponse; revoked_sessions: number }> {
      if (input.userId === input.callerId && !input.is_active) {
        throw AclErrors.cannotDeactivateSelf();
      }

      const userRecord = await userRepo.findById(input.userId);
      if (!userRecord) {
        throw AclErrors.userNotFound();
      }

      const now = Math.floor(Date.now() / 1000);
      await userRepo.updateStatus(userRecord.id, {
        is_active: input.is_active,
        updated_at: now,
      });

      let revokedSessions = 0;
      if (!input.is_active) {
        revokedSessions = await refreshTokenRepo.revokeAllForUser(
          userRecord.id,
          now
        );
      }

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(userRecord.id);

      return {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          whatsapp_number: userRecord.whatsapp_number,
          is_active: input.is_active,
          app_roles,
          app_permissions,
          created_at: userRecord.created_at,
          updated_at: now,
        },
        revoked_sessions: revokedSessions,
      };
    },

    async grantRole(input: {
      userId: string;
      app_id: string;
      role: string;
    }): Promise<AuthUserResponse> {
      await ensureSeeded();

      const userRecord = await userRepo.findById(input.userId);
      if (!userRecord) {
        throw AclErrors.userNotFound();
      }

      const roleRecord = await roleRepo.findByAppAndName(
        input.app_id,
        input.role
      );
      if (!roleRecord) {
        throw AclErrors.roleNotFoundForApp(input.app_id, input.role);
      }

      await roleRepo.assignUserAppRoles([
        {
          user_id: userRecord.id,
          app_id: roleRecord.app_id,
          role_id: roleRecord.id,
        },
      ]);

      return hydrateUser(userRecord);
    },

    async revokeRole(input: {
      callerId: string;
      userId: string;
      app_id: string;
      role: string;
    }): Promise<AuthUserResponse> {
      await ensureSeeded();

      if (input.userId === input.callerId && input.role === "admin") {
        throw AclErrors.cannotRevokeOwnAdmin();
      }

      const userRecord = await userRepo.findById(input.userId);
      if (!userRecord) {
        throw AclErrors.userNotFound();
      }

      const roleRecord = await roleRepo.findByAppAndName(
        input.app_id,
        input.role
      );
      if (!roleRecord) {
        throw AclErrors.roleNotFoundForApp(input.app_id, input.role);
      }

      await roleRepo.revokeUserAppRole(
        userRecord.id,
        roleRecord.app_id,
        roleRecord.id
      );

      return hydrateUser(userRecord);
    },

    async setAppRoles(input: {
      caller: AuthUserResponse;
      userId: string;
      app_id: string;
      roles: string[];
    }): Promise<AuthUserResponse> {
      await ensureSeeded();

      const uniqueRoleNames = Array.from(new Set(input.roles));

      if (
        input.userId === input.caller.id &&
        !uniqueRoleNames.includes("admin")
      ) {
        const callerHasOtherAppAdmin = Object.entries(
          input.caller.app_roles
        ).some(([k, list]) => k !== input.app_id && list.includes("admin"));

        if (!callerHasOtherAppAdmin) {
          throw AclErrors.cannotRemoveLastAdmin();
        }
      }

      const userRecord = await userRepo.findById(input.userId);
      if (!userRecord) {
        throw AclErrors.userNotFound();
      }

      const appRecord = await appRepo.findById(input.app_id);
      if (!appRecord) {
        throw AclErrors.appNotFound(input.app_id);
      }

      let targetRoles: Array<{ id: string; name: string }> = [];
      if (uniqueRoleNames.length > 0) {
        targetRoles = await roleRepo.findByAppAndNames(
          input.app_id,
          uniqueRoleNames
        );

        if (targetRoles.length !== uniqueRoleNames.length) {
          const foundNames = new Set(targetRoles.map((r) => r.name));
          const missing = uniqueRoleNames.filter((n) => !foundNames.has(n));
          throw AclErrors.unknownRoleNames(input.app_id, missing);
        }
      }

      await roleRepo.replaceUserAppRoles(
        userRecord.id,
        input.app_id,
        targetRoles.map((r) => r.id)
      );

      return hydrateUser(userRecord);
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
