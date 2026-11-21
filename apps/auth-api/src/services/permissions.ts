import { AclErrors } from "../errors/acl";
import type { AppRepo } from "../repositories/apps";
import type { PermissionRepo } from "../repositories/permissions";
import type { PermissionRecord } from "../types/acl";

export type PermissionServiceDeps = {
  appRepo: AppRepo;
  permissionRepo: PermissionRepo;
  ensureSeeded: () => Promise<void>;
};

export function createPermissionService({
  appRepo,
  permissionRepo,
  ensureSeeded,
}: PermissionServiceDeps) {
  return {
    async listPermissions(appId?: string): Promise<PermissionRecord[]> {
      await ensureSeeded();
      return permissionRepo.findAll(appId);
    },

    async createPermission(input: {
      app_id: string;
      slug: string;
      description: string;
    }): Promise<PermissionRecord> {
      await ensureSeeded();

      const appRecord = await appRepo.findById(input.app_id);
      if (!appRecord) {
        throw AclErrors.appNotFound(input.app_id);
      }

      const existing = await permissionRepo.findByAppAndSlug(
        input.app_id,
        input.slug
      );
      if (existing) {
        throw AclErrors.permissionAlreadyExists(input.app_id, input.slug);
      }

      return permissionRepo.create({
        id: `${input.app_id}:perm-${input.slug.replace(/[^a-z0-9]+/g, "-")}`,
        app_id: input.app_id,
        slug: input.slug,
        description: input.description,
      });
    },

    async deletePermission(permissionId: string): Promise<{ id: string }> {
      const perm = await permissionRepo.findById(permissionId);
      if (!perm) {
        throw AclErrors.permissionNotFound();
      }

      await permissionRepo.deleteById(perm.id);
      return { id: perm.id };
    },
  };
}

export type PermissionService = ReturnType<typeof createPermissionService>;
