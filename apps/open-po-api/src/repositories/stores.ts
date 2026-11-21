import { and, desc, eq, or, type SQL } from "drizzle-orm";
import { stores, type Database } from "../db";

export type StoreRecord = typeof stores.$inferSelect;
export type NewStoreRecord = typeof stores.$inferInsert;

export function createStoreRepo(db: Database) {
  return {
    async findAll(filters: {
      slug?: string;
      ownerId?: string;
    }): Promise<StoreRecord[]> {
      const conditions: SQL[] = [];
      if (filters.slug) {
        conditions.push(eq(stores.slug, filters.slug.toLowerCase()));
      }
      if (filters.ownerId) {
        conditions.push(eq(stores.owner_id, filters.ownerId));
      }

      const baseQuery = db
        .select()
        .from(stores)
        .orderBy(desc(stores.created_at));
      return conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;
    },

    async findByOwnerId(ownerId: string): Promise<StoreRecord[]> {
      return db
        .select()
        .from(stores)
        .where(eq(stores.owner_id, ownerId))
        .orderBy(desc(stores.created_at));
    },

    async findById(id: string): Promise<StoreRecord | null> {
      const [row] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, id))
        .limit(1);
      return row ?? null;
    },

    async findBySlug(slug: string): Promise<StoreRecord | null> {
      const [row] = await db
        .select()
        .from(stores)
        .where(eq(stores.slug, slug))
        .limit(1);
      return row ?? null;
    },

    async findByIdOrSlug(idOrSlug: string): Promise<StoreRecord | null> {
      const [row] = await db
        .select()
        .from(stores)
        .where(or(eq(stores.id, idOrSlug), eq(stores.slug, idOrSlug)))
        .limit(1);
      return row ?? null;
    },

    async create(input: NewStoreRecord): Promise<StoreRecord> {
      await db.insert(stores).values(input);
      return {
        ...input,
        logo_url: input.logo_url ?? null,
      };
    },

    async update(
      id: string,
      input: {
        name: string;
        slug: string;
        description: string;
        payment_instructions: string;
        whatsapp_contact: string;
      }
    ): Promise<void> {
      await db.update(stores).set(input).where(eq(stores.id, id));
    },

    async updateLogoUrl(id: string, logoUrl: string): Promise<void> {
      await db
        .update(stores)
        .set({ logo_url: logoUrl })
        .where(eq(stores.id, id));
    },
  };
}

export type StoreRepo = ReturnType<typeof createStoreRepo>;
