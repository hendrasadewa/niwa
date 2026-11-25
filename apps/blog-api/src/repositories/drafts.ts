import { and, desc, eq, ne } from "drizzle-orm";
import type { Database } from "../db";
import { drafts, type DraftRow, type NewDraftRow } from "../db/schema";

export function createDraftRepo(db: Database) {
  return {
    async listByAuthor(authorId: string): Promise<DraftRow[]> {
      return db
        .select()
        .from(drafts)
        .where(eq(drafts.author_id, authorId))
        .orderBy(desc(drafts.updated_at))
        .all();
    },

    async findById(id: string): Promise<DraftRow | null> {
      const row = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, id))
        .get();
      return row ?? null;
    },

    async findBySlug(slug: string, excludeId?: string): Promise<DraftRow | null> {
      const condition = excludeId
        ? and(eq(drafts.slug, slug), ne(drafts.id, excludeId))
        : eq(drafts.slug, slug);
      const row = await db.select().from(drafts).where(condition).get();
      return row ?? null;
    },

    async create(input: NewDraftRow): Promise<DraftRow> {
      await db.insert(drafts).values(input);
      const created = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, input.id))
        .get();
      if (!created) {
        throw new Error("Failed to read back inserted draft row");
      }
      return created;
    },

    async update(
      id: string,
      patch: Partial<Omit<NewDraftRow, "id" | "author_id" | "created_at">>
    ): Promise<DraftRow | null> {
      await db.update(drafts).set(patch).where(eq(drafts.id, id));
      const updated = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, id))
        .get();
      return updated ?? null;
    },

    async delete(id: string): Promise<void> {
      await db.delete(drafts).where(eq(drafts.id, id));
    },
  };
}

export type DraftRepo = ReturnType<typeof createDraftRepo>;
