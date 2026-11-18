import { eq, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { stores, type Database } from "../db";
import type { AppEnv, AuthUser, RoleName } from "../types";

/**
 * RBAC middleware checking that the authenticated user possesses at least one of the allowed roles.
 * Admin users automatically pass role checks.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    const hasRole =
      user.roles.includes("admin") ||
      allowedRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      return c.json(
        {
          error: "Forbidden",
          message: `Insufficient role privileges. Required: ${allowedRoles.join(" or ")}`,
        },
        403
      );
    }

    await next();
  });
}

/**
 * RBAC middleware checking that the authenticated user's roles grant all required permission slugs.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    const isAdmin = user.roles.includes("admin");
    const hasPermissions =
      isAdmin ||
      requiredPermissions.every((perm) => user.permissions.includes(perm));

    if (!hasPermissions) {
      return c.json(
        {
          error: "Forbidden",
          message: `Missing required permission(s): ${requiredPermissions.join(", ")}`,
        },
        403
      );
    }

    await next();
  });
}

/**
 * Helper to fetch a store by ID or slug and verify that the authenticated user owns it (or is a global admin).
 */
export async function checkStoreOwnership(
  db: Database,
  storeIdOrSlug: string,
  user: AuthUser
): Promise<
  | { ok: true; store: typeof stores.$inferSelect }
  | { ok: false; status: 403 | 404; error: string; message: string }
> {
  const [store] = await db
    .select()
    .from(stores)
    .where(or(eq(stores.id, storeIdOrSlug), eq(stores.slug, storeIdOrSlug)))
    .limit(1);

  if (!store) {
    return {
      ok: false,
      status: 404,
      error: "NotFound",
      message: "Store not found",
    };
  }

  const isOwnerOrAdmin =
    store.owner_id === user.id || user.roles.includes("admin");
  if (!isOwnerOrAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      message: "You do not have permission to manage this store",
    };
  }

  return { ok: true, store };
}
