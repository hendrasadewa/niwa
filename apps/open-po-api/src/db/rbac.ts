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
      "Full platform administrator privileges across all stores, products, waves, orders, and users.",
  },
  {
    id: "role-seller",
    name: "seller",
    description:
      "Store owner who can manage their own store settings, master product catalog, pre-order waves, and order statuses.",
  },
  {
    id: "role-member",
    name: "member",
    description:
      "Registered customer who can browse catalogs, manage profile/shipping addresses, view order history, and submit post-delivery reviews.",
  },
];

export const DEFAULT_PERMISSIONS: ReadonlyArray<{
  id: string;
  slug: string;
  description: string;
  roles: RoleName[];
}> = [
  {
    id: "perm-catalog-read",
    slug: "catalog:read",
    description: "View store profiles, products, and active pre-order waves",
    roles: ["admin", "seller", "member"],
  },
  {
    id: "perm-store-manage",
    slug: "store:manage",
    description: "Create and manage store configuration, payment instructions, and logo",
    roles: ["admin", "seller"],
  },
  {
    id: "perm-products-manage",
    slug: "products:manage",
    description: "Create, update, archive, and upload images for master catalog products",
    roles: ["admin", "seller"],
  },
  {
    id: "perm-waves-manage",
    slug: "waves:manage",
    description: "Create, configure, and transition pre-order waves and product snapshots",
    roles: ["admin", "seller"],
  },
  {
    id: "perm-orders-manage",
    slug: "orders:manage",
    description: "View store order Kanban dashboard and advance order statuses",
    roles: ["admin", "seller"],
  },
  {
    id: "perm-orders-place",
    slug: "orders:place",
    description: "Place orders and view personal order history",
    roles: ["admin", "seller", "member"],
  },
  {
    id: "perm-reviews-write",
    slug: "reviews:write",
    description: "Submit post-delivery product reviews and ratings",
    roles: ["admin", "seller", "member"],
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
