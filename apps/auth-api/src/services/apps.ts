import { AclErrors } from "../errors/acl";
import type { AppRecord, AppRepo } from "../repositories/apps";
import type { PermissionRepo } from "../repositories/permissions";
import type { RoleRepo } from "../repositories/roles";
import type { AppWithRbac } from "../types/acl";
import { parseJsonStringArray } from "../utils/origin";

export type AppServiceDeps = {
  appRepo: AppRepo;
  roleRepo: RoleRepo;
  permissionRepo: PermissionRepo;
  ensureSeeded: () => Promise<void>;
};

function mapAppRecord(
  app: AppRecord,
  roles: AppWithRbac["roles"],
  permissions: AppWithRbac["permissions"]
): AppWithRbac {
  return {
    id: app.id,
    name: app.name,
    description: app.description,
    allowed_origins: parseJsonStringArray(app.allowed_origins),
    allowed_redirect_uris: parseJsonStringArray(app.allowed_redirect_uris),
    default_role_name: app.default_role_name ?? null,
    require_consent: app.require_consent,
    icon_url: app.icon_url ?? null,
    roles,
    permissions,
  };
}

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

      return appRows.map((app) =>
        mapAppRecord(
          app,
          roleRows
            .filter((r) => r.app_id === app.id)
            .map((r) => ({
              ...r,
              permissions: permsByRoleId.get(r.id) ?? [],
            })),
          permRows.filter((p) => p.app_id === app.id)
        )
      );
    },

    async createApp(input: {
      id: string;
      name: string;
      description: string;
      allowed_origins?: string[];
      allowed_redirect_uris?: string[];
      default_role_name?: string | null;
      require_consent?: boolean;
      icon_url?: string | null;
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
        allowed_origins: JSON.stringify(input.allowed_origins ?? []),
        allowed_redirect_uris: JSON.stringify(
          input.allowed_redirect_uris ?? []
        ),
        default_role_name:
          input.default_role_name !== undefined
            ? input.default_role_name
            : "member",
        require_consent: input.require_consent ?? true,
        icon_url: input.icon_url ?? null,
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

      return mapAppRecord(
        newApp,
        defaultAppRoles.map((r) => ({ ...r, permissions: [] })),
        []
      );
    },

    async updateApp(
      appId: string,
      input: {
        name?: string;
        description?: string;
        allowed_origins?: string[];
        allowed_redirect_uris?: string[];
        default_role_name?: string | null;
        require_consent?: boolean;
        icon_url?: string | null;
      }
    ): Promise<AppWithRbac> {
      await ensureSeeded();

      const existing = await appRepo.findById(appId);
      if (!existing) {
        throw AclErrors.appNotFound(appId);
      }

      const updated = await appRepo.update(appId, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.allowed_origins !== undefined
          ? { allowed_origins: JSON.stringify(input.allowed_origins) }
          : {}),
        ...(input.allowed_redirect_uris !== undefined
          ? {
              allowed_redirect_uris: JSON.stringify(
                input.allowed_redirect_uris
              ),
            }
          : {}),
        ...(input.default_role_name !== undefined
          ? { default_role_name: input.default_role_name }
          : {}),
        ...(input.require_consent !== undefined
          ? { require_consent: input.require_consent }
          : {}),
        ...(input.icon_url !== undefined ? { icon_url: input.icon_url } : {}),
      });

      if (!updated) {
        throw AclErrors.appNotFound(appId);
      }

      const [roleRows, permRows, permsByRoleId] = await Promise.all([
        roleRepo.findAll(appId),
        permissionRepo.findAll(appId),
        roleRepo.listPermissionSlugsByRoleIds(),
      ]);

      return mapAppRecord(
        updated,
        roleRows.map((r) => ({
          ...r,
          permissions: permsByRoleId.get(r.id) ?? [],
        })),
        permRows
      );
    },
  };
}

export type AppService = ReturnType<typeof createAppService>;
