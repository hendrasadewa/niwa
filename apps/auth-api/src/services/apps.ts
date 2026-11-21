import { AclErrors } from "../errors/acl";
import type { AppRepo } from "../repositories/apps";
import type { PermissionRepo } from "../repositories/permissions";
import type { RoleRepo } from "../repositories/roles";
import type { AppWithRbac } from "../types/acl";

export type AppServiceDeps = {
  appRepo: AppRepo;
  roleRepo: RoleRepo;
  permissionRepo: PermissionRepo;
  ensureSeeded: () => Promise<void>;
};

export function createAppService({
  appRepo,
  roleRepo,
  permissionRepo,
  ensureSeeded,
}: AppServiceDeps) {
  return {
    async listApps(appId?: string): Promise<AppWithRbac[]> {
      await ensureSeeded();

      const [appRows, roleRows, permRows, permsByRoleId] = await Promise.all([
        appRepo.findAll(appId),
        roleRepo.findAll(appId),
        permissionRepo.findAll(appId),
        roleRepo.listPermissionSlugsByRoleIds(),
      ]);

      return appRows.map((app) => ({
        ...app,
        roles: roleRows
          .filter((r) => r.app_id === app.id)
          .map((r) => ({
            ...r,
            permissions: permsByRoleId.get(r.id) ?? [],
          })),
        permissions: permRows.filter((p) => p.app_id === app.id),
      }));
    },

    async createApp(input: {
      id: string;
      name: string;
      description: string;
    }): Promise<AppWithRbac> {
      await ensureSeeded();

      const existing = await appRepo.findById(input.id);
      if (existing) {
        throw AclErrors.appAlreadyExists(input.id);
      }

      const newApp = await appRepo.create({
        id: input.id,
        name: input.name,
        description: input.description,
      });

      const defaultAppRoles = [
        {
          id: `${input.id}:role-admin`,
          app_id: input.id,
          name: "admin",
          description: `Administrator role for ${input.name}`,
        },
        {
          id: `${input.id}:role-member`,
          app_id: input.id,
          name: "member",
          description: `Default member role for ${input.name}`,
        },
      ];
      await roleRepo.createManyIgnoreConflicts(defaultAppRoles);

      return {
        ...newApp,
        roles: defaultAppRoles.map((r) => ({ ...r, permissions: [] })),
        permissions: [],
      };
    },
  };
}

export type AppService = ReturnType<typeof createAppService>;
