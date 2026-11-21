import { and, eq, inArray } from "drizzle-orm";
import {
  permissions,
  rolePermissions,
  roles,
  userAppRoles,
  type Database,
} from "../db";
import type { AppPermissionMap, AppRoleMap } from "../types/auth";

export type RoleRecord = typeof roles.$inferSelect;
export type NewRoleRecord = typeof roles.$inferInsert;
export type UserAppRoleAssignment = typeof userAppRoles.$inferInsert;

export function createRoleRepo(db: Database) {
  return {
    async findAll(appId?: string): Promise<RoleRecord[]> {
      return appId
        ? db.select().from(roles).where(eq(roles.app_id, appId))
        : db.select().from(roles);
    },

    async findById(id: string): Promise<RoleRecord | null> {
      const [row] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByAppAndName(
      appId: string,
      name: string
    ): Promise<RoleRecord | null> {
      const [row] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.app_id, appId), eq(roles.name, name)))
        .limit(1);
      return row ?? null;
    },

    async findByAppAndNames(
      appId: string,
      names: string[]
    ): Promise<Array<{ id: string; name: string }>> {
      if (names.length === 0) return [];
      return db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(and(eq(roles.app_id, appId), inArray(roles.name, names)));
    },

    async create(input: NewRoleRecord): Promise<RoleRecord> {
      await db.insert(roles).values(input);
      return input;
    },

    async createManyIgnoreConflicts(records: NewRoleRecord[]): Promise<void> {
      if (records.length === 0) return;
      await db.insert(roles).values(records).onConflictDoNothing();
    },

    async deleteById(id: string): Promise<void> {
      await db.delete(roles).where(eq(roles.id, id));
    },

    async listPermissionSlugsByRoleIds(
      roleIds?: string[]
    ): Promise<Map<string, string[]>> {
      const permsByRole = new Map<string, string[]>();
      if (roleIds && roleIds.length === 0) {
        return permsByRole;
      }

      const baseQuery = db
        .select({
          role_id: rolePermissions.role_id,
          slug: permissions.slug,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permission_id, permissions.id)
        );

      const rows = roleIds
        ? await baseQuery.where(inArray(rolePermissions.role_id, roleIds))
        : await baseQuery;

      for (const row of rows) {
        const list = permsByRole.get(row.role_id) ?? [];
        list.push(row.slug);
        permsByRole.set(row.role_id, list);
      }

      return permsByRole;
    },

    async attachPermissions(
      roleId: string,
      permissionIds: string[]
    ): Promise<void> {
      if (permissionIds.length === 0) return;
      await db
        .insert(rolePermissions)
        .values(
          permissionIds.map((permission_id) => ({
            role_id: roleId,
            permission_id,
          }))
        )
        .onConflictDoNothing();
    },

    async replaceRolePermissions(
      roleId: string,
      permissionIds: string[]
    ): Promise<void> {
      const deleteQuery = db
        .delete(rolePermissions)
        .where(eq(rolePermissions.role_id, roleId));

      if (permissionIds.length === 0) {
        await deleteQuery;
        return;
      }

      await db.batch([
        deleteQuery,
        db
          .insert(rolePermissions)
          .values(
            permissionIds.map((permission_id) => ({
              role_id: roleId,
              permission_id,
            }))
          )
          .onConflictDoNothing(),
      ]);
    },

    async assignUserAppRoles(
      assignments: UserAppRoleAssignment[]
    ): Promise<void> {
      if (assignments.length === 0) return;
      await db
        .insert(userAppRoles)
        .values(assignments)
        .onConflictDoNothing();
    },

    async revokeUserAppRole(
      userId: string,
      appId: string,
      roleId: string
    ): Promise<void> {
      await db
        .delete(userAppRoles)
        .where(
          and(
            eq(userAppRoles.user_id, userId),
            eq(userAppRoles.app_id, appId),
            eq(userAppRoles.role_id, roleId)
          )
        );
    },

    async replaceUserAppRoles(
      userId: string,
      appId: string,
      roleIds: string[]
    ): Promise<void> {
      const deleteQuery = db
        .delete(userAppRoles)
        .where(
          and(eq(userAppRoles.user_id, userId), eq(userAppRoles.app_id, appId))
        );

      if (roleIds.length === 0) {
        await deleteQuery;
        return;
      }

      await db.batch([
        deleteQuery,
        db
          .insert(userAppRoles)
          .values(
            roleIds.map((role_id) => ({
              user_id: userId,
              app_id: appId,
              role_id,
            }))
          )
          .onConflictDoNothing(),
      ]);
    },

    async getUserAppRolesAndPermissions(
      userId: string
    ): Promise<{ app_roles: AppRoleMap; app_permissions: AppPermissionMap }> {
      const assignedRoles = await db
        .select({
          appId: userAppRoles.app_id,
          roleId: roles.id,
          roleName: roles.name,
        })
        .from(userAppRoles)
        .innerJoin(roles, eq(userAppRoles.role_id, roles.id))
        .where(eq(userAppRoles.user_id, userId));

      const appRoles: AppRoleMap = {};
      const roleIds: string[] = [];

      for (const row of assignedRoles) {
        roleIds.push(row.roleId);
        const list = appRoles[row.appId] ?? [];
        if (!list.includes(row.roleName)) {
          list.push(row.roleName);
        }
        appRoles[row.appId] = list;
      }

      const appPermissions: AppPermissionMap = {};
      if (roleIds.length === 0) {
        return { app_roles: appRoles, app_permissions: appPermissions };
      }

      const assignedPerms = await db
        .select({
          appId: permissions.app_id,
          slug: permissions.slug,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permission_id, permissions.id)
        )
        .where(inArray(rolePermissions.role_id, roleIds));

      for (const perm of assignedPerms) {
        const list = appPermissions[perm.appId] ?? [];
        if (!list.includes(perm.slug)) {
          list.push(perm.slug);
        }
        appPermissions[perm.appId] = list;
      }

      return {
        app_roles: appRoles,
        app_permissions: appPermissions,
      };
    },
  };
}

export type RoleRepo = ReturnType<typeof createRoleRepo>;
