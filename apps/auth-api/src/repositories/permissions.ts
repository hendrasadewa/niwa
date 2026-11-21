import { and, eq, inArray } from "drizzle-orm";
import { permissions, type Database } from "../db";
import type { PermissionRecord } from "../types/acl";

export type NewPermissionRecord = typeof permissions.$inferInsert;

export function createPermissionRepo(db: Database) {
  return {
    async findAll(appId?: string): Promise<PermissionRecord[]> {
      return appId
        ? db.select().from(permissions).where(eq(permissions.app_id, appId))
        : db.select().from(permissions);
    },

    async findById(id: string): Promise<PermissionRecord | null> {
      const [row] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByAppAndSlug(
      appId: string,
      slug: string
    ): Promise<PermissionRecord | null> {
      const [row] = await db
        .select()
        .from(permissions)
        .where(and(eq(permissions.app_id, appId), eq(permissions.slug, slug)))
        .limit(1);
      return row ?? null;
    },

    async findByAppAndSlugs(
      appId: string,
      slugs: string[]
    ): Promise<Array<{ id: string; slug: string }>> {
      if (slugs.length === 0) return [];
      return db
        .select({ id: permissions.id, slug: permissions.slug })
        .from(permissions)
        .where(
          and(
            eq(permissions.app_id, appId),
            inArray(permissions.slug, slugs)
          )
        );
    },

    async create(input: NewPermissionRecord): Promise<PermissionRecord> {
      await db.insert(permissions).values(input);
      return input;
    },

    async deleteById(id: string): Promise<void> {
      await db.delete(permissions).where(eq(permissions.id, id));
    },
  };
}

export type PermissionRepo = ReturnType<typeof createPermissionRepo>;
