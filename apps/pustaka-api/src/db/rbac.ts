import { eq, inArray } from "drizzle-orm";
import type { Database } from "./index";
import { permissions, rolePermissions, roles, userRoles } from "./schema";
import type { RoleName } from "../types";

export const DEFAULT_ROLES: ReadonlyArray<{
  id: string;
  name: RoleName;
  description: string;
}> = [
  {
    id: "role-admin",
    name: "admin",
    description:
      "Full privileges over book inventory, bookshelf locations, user management, and role assignments.",
  },
  {
    id: "role-member",
    name: "member",
    description:
      "View inventory, manage personal reading lists, update reading progress, and add reviews.",
  },
];

export const DEFAULT_PERMISSIONS: ReadonlyArray<{
  id: string;
  slug: string;
  description: string;
  roles: RoleName[];
}> = [
  {
    id: "perm-inventory-read",
    slug: "inventory:read",
    description: "View bookshelves and book inventory",
    roles: ["admin", "member"],
  },
  {
    id: "perm-inventory-write",
    slug: "inventory:write",
    description: "Create, update, move, and delete bookshelves, books, and covers",
    roles: ["admin"],
  },
  {
    id: "perm-reading-manage",
    slug: "reading:manage",
    description: "Manage personal reading list and reading progress",
    roles: ["admin", "member"],
  },
  {
    id: "perm-reviews-write",
    slug: "reviews:write",
    description: "Create book reviews and ratings",
    roles: ["admin", "member"],
  },
  {
    id: "perm-users-manage",
    slug: "users:manage",
    description: "Manage users and role assignments",
    roles: ["admin"],
  },
];

/**
 * Ensures default RBAC roles, permissions, and role_permissions exist in D1.
 */
export async function ensureRbacSeeded(db: Database): Promise<void> {
  await db
    .insert(roles)
    .values(
      DEFAULT_ROLES.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(permissions)
    .values(
      DEFAULT_PERMISSIONS.map((p) => ({
        id: p.id,
        slug: p.slug,
        description: p.description,
      }))
    )
    .onConflictDoNothing();

  const rolePermValues: Array<{ role_id: string; permission_id: string }> = [];
  for (const perm of DEFAULT_PERMISSIONS) {
    for (const roleName of perm.roles) {
      const roleObj = DEFAULT_ROLES.find((r) => r.name === roleName);
      if (roleObj) {
        rolePermValues.push({
          role_id: roleObj.id,
          permission_id: perm.id,
        });
      }
    }
  }

  if (rolePermValues.length > 0) {
    await db
      .insert(rolePermissions)
      .values(rolePermValues)
      .onConflictDoNothing();
  }
}

/**
 * Resolves a user's assigned role names and permission slugs from D1.
 */
export async function getUserRolesAndPermissions(
  db: Database,
  userId: string
): Promise<{ roles: RoleName[]; permissions: string[] }> {
  const assignedRoles = await db
    .select({
      roleId: roles.id,
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(eq(userRoles.user_id, userId));

  const roleNames = assignedRoles.map((r) => r.roleName as RoleName);
  const roleIds = assignedRoles.map((r) => r.roleId);

  if (roleIds.length === 0) {
    return { roles: [], permissions: [] };
  }

  const assignedPermissions = await db
    .select({
      slug: permissions.slug,
    })
    .from(rolePermissions)
    .innerJoin(
      permissions,
      eq(rolePermissions.permission_id, permissions.id)
    )
    .where(inArray(rolePermissions.role_id, roleIds));

  const uniquePermissions = Array.from(
    new Set(assignedPermissions.map((p) => p.slug))
  );

  return {
    roles: roleNames,
    permissions: uniquePermissions,
  };
}
