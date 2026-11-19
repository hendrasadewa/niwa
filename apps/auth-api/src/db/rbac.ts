import { eq, inArray } from "drizzle-orm";
import type { Database } from "./index";
import {
  apps,
  permissions,
  rolePermissions,
  roles,
  userAppRoles,
} from "./schema";
import type { AppPermissionMap, AppRoleMap } from "../types";

export const DEFAULT_APPS: ReadonlyArray<{
  id: string;
  name: string;
  description: string;
}> = [
  {
    id: "open-po",
    name: "Open-PO",
    description: "UMKM Pre-Order Management & Micro-Ecommerce Platform",
  },
  {
    id: "pustaka",
    name: "Pustaka",
    description: "Personal Library, Bookshelf Inventory & Reading Tracker",
  },
];

export const DEFAULT_ROLES: ReadonlyArray<{
  id: string;
  app_id: string;
  name: string;
  description: string;
}> = [
  // Open-PO roles
  {
    id: "open-po:role-admin",
    app_id: "open-po",
    name: "admin",
    description:
      "Full platform administrator privileges across all Open-PO stores, products, waves, orders, and users.",
  },
  {
    id: "open-po:role-seller",
    app_id: "open-po",
    name: "seller",
    description:
      "Store owner who can manage their own store settings, master product catalog, pre-order waves, and order statuses.",
  },
  {
    id: "open-po:role-member",
    app_id: "open-po",
    name: "member",
    description:
      "Registered customer who can browse catalogs, manage profile/shipping addresses, view order history, and submit post-delivery reviews.",
  },
  // Pustaka roles
  {
    id: "pustaka:role-admin",
    app_id: "pustaka",
    name: "admin",
    description:
      "Full privileges over Pustaka book inventory, bookshelf locations, user management, and role assignments.",
  },
  {
    id: "pustaka:role-member",
    app_id: "pustaka",
    name: "member",
    description:
      "View inventory, manage personal reading lists, update reading progress, and add book reviews.",
  },
];

export const DEFAULT_PERMISSIONS: ReadonlyArray<{
  id: string;
  app_id: string;
  slug: string;
  description: string;
  roles: string[];
}> = [
  // Open-PO permissions
  {
    id: "open-po:perm-catalog-read",
    app_id: "open-po",
    slug: "catalog:read",
    description: "View store profiles, products, and active pre-order waves",
    roles: ["admin", "seller", "member"],
  },
  {
    id: "open-po:perm-store-manage",
    app_id: "open-po",
    slug: "store:manage",
    description:
      "Create and manage store configuration, payment instructions, and logo",
    roles: ["admin", "seller"],
  },
  {
    id: "open-po:perm-products-manage",
    app_id: "open-po",
    slug: "products:manage",
    description:
      "Create, update, archive, and upload images for master catalog products",
    roles: ["admin", "seller"],
  },
  {
    id: "open-po:perm-waves-manage",
    app_id: "open-po",
    slug: "waves:manage",
    description:
      "Create, configure, and transition pre-order waves and product snapshots",
    roles: ["admin", "seller"],
  },
  {
    id: "open-po:perm-orders-manage",
    app_id: "open-po",
    slug: "orders:manage",
    description: "View store order Kanban dashboard and advance order statuses",
    roles: ["admin", "seller"],
  },
  {
    id: "open-po:perm-orders-place",
    app_id: "open-po",
    slug: "orders:place",
    description: "Place orders and view personal order history",
    roles: ["admin", "seller", "member"],
  },
  {
    id: "open-po:perm-reviews-write",
    app_id: "open-po",
    slug: "reviews:write",
    description: "Submit post-delivery product reviews and ratings",
    roles: ["admin", "seller", "member"],
  },
  // Pustaka permissions
  {
    id: "pustaka:perm-inventory-read",
    app_id: "pustaka",
    slug: "inventory:read",
    description: "View bookshelves and book inventory",
    roles: ["admin", "member"],
  },
  {
    id: "pustaka:perm-inventory-write",
    app_id: "pustaka",
    slug: "inventory:write",
    description: "Create, update, move, and delete bookshelves, books, and covers",
    roles: ["admin"],
  },
  {
    id: "pustaka:perm-reading-manage",
    app_id: "pustaka",
    slug: "reading:manage",
    description: "Manage personal reading list and reading progress",
    roles: ["admin", "member"],
  },
  {
    id: "pustaka:perm-reviews-write",
    app_id: "pustaka",
    slug: "reviews:write",
    description: "Create book reviews and ratings",
    roles: ["admin", "member"],
  },
  {
    id: "pustaka:perm-users-manage",
    app_id: "pustaka",
    slug: "users:manage",
    description: "Manage users and role assignments",
    roles: ["admin"],
  },
];

/**
 * Ensures default apps, roles, permissions, and role_permissions exist in D1.
 */
export async function ensureRbacSeeded(db: Database): Promise<void> {
  await db
    .insert(apps)
    .values(
      DEFAULT_APPS.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(roles)
    .values(
      DEFAULT_ROLES.map((r) => ({
        id: r.id,
        app_id: r.app_id,
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
        app_id: p.app_id,
        slug: p.slug,
        description: p.description,
      }))
    )
    .onConflictDoNothing();

  const rolePermValues: Array<{ role_id: string; permission_id: string }> = [];
  for (const perm of DEFAULT_PERMISSIONS) {
    for (const roleName of perm.roles) {
      const roleObj = DEFAULT_ROLES.find(
        (r) => r.app_id === perm.app_id && r.name === roleName
      );
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
 * Resolves a user's app-scoped roles and permissions from D1.
 */
export async function getUserAppRolesAndPermissions(
  db: Database,
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
}
