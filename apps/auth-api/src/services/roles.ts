import { AclErrors } from "../errors/acl";
import type { AppRepo } from "../repositories/apps";
import type { PermissionRepo } from "../repositories/permissions";
import type { RoleRepo } from "../repositories/roles";
import type { RoleWithPermissions } from "../types/acl";

const PROTECTED_ROLE_NAMES = new Set(["admin", "member"]);

export type RoleServiceDeps = {
  appRepo: AppRepo;
  roleRepo: RoleRepo;
  permissionRepo: PermissionRepo;
  ensureSeeded: () => Promise<void>;
};

export function createRoleService({
  appRepo,
  roleRepo,
  permissionRepo,
  ensureSeeded,
}: RoleServiceDeps) {
  return {
    async listRoles(appId?: string): Promise<RoleWithPermissions[]> {
      await ensureSeeded();

      const roleRows = await roleRepo.findAll(appId);
      const roleIds = roleRows.map((r) => r.id);
      const permsByRole = await roleRepo.listPermissionSlugsByRoleIds(roleIds);

      return roleRows.map((r) => ({
        ...r,
        permissions: permsByRole.get(r.id) ?? [],
      }));
    },

    async createRole(input: {
      app_id: string;
      name: string;
      description: string;
      permission_slugs?: string[];
    }): Promise<RoleWithPermissions> {
      await ensureSeeded();

      const appRecord = await appRepo.findById(input.app_id);
      if (!appRecord) {
        throw AclErrors.appNotFound(input.app_id);
      }

      const existingRole = await roleRepo.findByAppAndName(
        input.app_id,
        input.name
      );
      if (existingRole) {
        throw AclErrors.roleAlreadyExists(input.app_id, input.name);
      }

      let matchedPermissions: Array<{ id: string; slug: string }> = [];
      if (input.permission_slugs && input.permission_slugs.length > 0) {
        const uniqueSlugs = Array.from(new Set(input.permission_slugs));
        matchedPermissions = await permissionRepo.findByAppAndSlugs(
          input.app_id,
          uniqueSlugs
        );

        if (matchedPermissions.length !== uniqueSlugs.length) {
          const foundSlugs = new Set(matchedPermissions.map((p) => p.slug));
          const missing = uniqueSlugs.filter((s) => !foundSlugs.has(s));
          throw AclErrors.unknownPermissionSlugs(input.app_id, missing);
        }
      }

      const roleId = `${input.app_id}:role-${input.name}`;
      const newRole = await roleRepo.create({
        id: roleId,
        app_id: input.app_id,
        name: input.name,
        description: input.description,
      });

      await roleRepo.attachPermissions(
        roleId,
        matchedPermissions.map((p) => p.id)
      );

      return {
        ...newRole,
        permissions: matchedPermissions.map((p) => p.slug),
      };
    },

    async updateRolePermissions(input: {
      roleId: string;
      permission_slugs: string[];
    }): Promise<RoleWithPermissions> {
      await ensureSeeded();

      const roleRecord = await roleRepo.findById(input.roleId);
      if (!roleRecord) {
        throw AclErrors.roleNotFound();
      }

      const uniqueSlugs = Array.from(new Set(input.permission_slugs));
      let matchedPermissions: Array<{ id: string; slug: string }> = [];

      if (uniqueSlugs.length > 0) {
        matchedPermissions = await permissionRepo.findByAppAndSlugs(
          roleRecord.app_id,
          uniqueSlugs
        );

        if (matchedPermissions.length !== uniqueSlugs.length) {
          const foundSlugs = new Set(matchedPermissions.map((p) => p.slug));
          const missing = uniqueSlugs.filter((s) => !foundSlugs.has(s));
          throw AclErrors.unknownPermissionSlugs(roleRecord.app_id, missing);
        }
      }

      await roleRepo.replaceRolePermissions(
        roleRecord.id,
        matchedPermissions.map((p) => p.id)
      );

      return {
        ...roleRecord,
        permissions: matchedPermissions.map((p) => p.slug),
      };
    },

    async deleteRole(roleId: string): Promise<{ id: string }> {
      const roleRecord = await roleRepo.findById(roleId);
      if (!roleRecord) {
        throw AclErrors.roleNotFound();
      }

      if (PROTECTED_ROLE_NAMES.has(roleRecord.name)) {
        throw AclErrors.protectedRole(roleRecord.name);
      }

      await roleRepo.deleteById(roleRecord.id);
      return { id: roleRecord.id };
    },
  };
}

export type RoleService = ReturnType<typeof createRoleService>;
