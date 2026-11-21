import type { Database } from "./index";
import { apps, permissions, rolePermissions, roles } from "./schema";

export const DEFAULT_APPS: ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  allowed_origins: string[];
  allowed_redirect_uris: string[];
  default_role_name: string | null;
  require_consent: boolean;
  icon_url: string | null;
}> = [
  {
    id: "auth-web",
    name: "Niwa Account",
    description: "Central Identity, Security & Access Management Portal",
    allowed_origins: [
      "https://auth.hendrasadewa.com",
      "http://localhost:3003",
    ],
    allowed_redirect_uris: [
      "https://auth.hendrasadewa.com",
      "http://localhost:3003",
    ],
    default_role_name: null,
    require_consent: false,
    icon_url: null,
  },
  {
    id: "open-po",
    name: "Open-PO",
    description: "UMKM Pre-Order Management & Micro-Ecommerce Platform",
    allowed_origins: [
      "https://preorder.hendrasadewa.com",
      "http://localhost:3002",
    ],
    allowed_redirect_uris: [
      "https://preorder.hendrasadewa.com",
      "http://localhost:3002",
    ],
    default_role_name: "member",
    require_consent: true,
    icon_url: null,
  },
  {
    id: "pustaka",
    name: "Pustaka",
    description: "Personal Library, Bookshelf Inventory & Reading Tracker",
    allowed_origins: [
      "https://pustaka.hendrasadewa.com",
      "http://localhost:3001",
    ],
    allowed_redirect_uris: [
      "https://pustaka.hendrasadewa.com",
      "http://localhost:3001",
    ],
    default_role_name: "member",
    require_consent: true,
    icon_url: null,
  },
  {
    id: "labs",
    name: "Niwa Labs",
    description: "Interactive Experiments, Demos, and Prototypes",
    allowed_origins: [
      "https://labs.hendrasadewa.com",
      "http://localhost:5173",
    ],
    allowed_redirect_uris: [
      "https://labs.hendrasadewa.com",
      "http://localhost:5173",
    ],
    default_role_name: "member",
    require_consent: true,
    icon_url: null,
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
  // Labs roles
  {
    id: "labs:role-admin",
    app_id: "labs",
    name: "admin",
    description: "Administrator privileges for Niwa Labs experiments.",
  },
  {
    id: "labs:role-member",
    app_id: "labs",
    name: "member",
    description: "Default member role for Niwa Labs experiments.",
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

let rbacSeededPromise: Promise<void> | null = null;

async function runRbacSeed(db: Database): Promise<void> {
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

  await db.batch([
    db
      .insert(apps)
      .values(
        DEFAULT_APPS.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          allowed_origins: JSON.stringify(a.allowed_origins),
          allowed_redirect_uris: JSON.stringify(a.allowed_redirect_uris),
          default_role_name: a.default_role_name,
          require_consent: a.require_consent,
          icon_url: a.icon_url,
        }))
      )
      .onConflictDoNothing(),
    db
      .insert(roles)
      .values(
        DEFAULT_ROLES.map((r) => ({
          id: r.id,
          app_id: r.app_id,
          name: r.name,
          description: r.description,
        }))
      )
      .onConflictDoNothing(),
    db
      .insert(permissions)
      .values(
        DEFAULT_PERMISSIONS.map((p) => ({
          id: p.id,
          app_id: p.app_id,
          slug: p.slug,
          description: p.description,
        }))
      )
      .onConflictDoNothing(),
    ...(rolePermValues.length > 0
      ? [db.insert(rolePermissions).values(rolePermValues).onConflictDoNothing()]
      : []),
  ]);
}

/**
 * Ensures default apps, roles, permissions, and role_permissions exist in D1.
 * Memoized per Worker isolate to avoid redundant D1 round-trips on every request.
 */
export function ensureRbacSeeded(db: Database): Promise<void> {
  if (!rbacSeededPromise) {
    rbacSeededPromise = runRbacSeed(db).catch((err) => {
      rbacSeededPromise = null;
      throw err;
    });
  }
  return rbacSeededPromise;
}
