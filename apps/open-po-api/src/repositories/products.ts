import { and, eq, like, or, type SQL } from "drizzle-orm";
import { products, type Database } from "../db";

export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;

export function createProductRepo(db: Database) {
  return {
    async findAll(filters: {
      storeId?: string;
      search?: string;
      includeArchived?: boolean;
    }): Promise<ProductRecord[]> {
      const conditions: SQL[] = [];

      if (filters.storeId) {
        conditions.push(eq(products.store_id, filters.storeId));
      }

      if (!filters.includeArchived) {
        conditions.push(eq(products.is_archived, false));
      }

      if (filters.search) {
        const pattern = `%${filters.search}%`;
        const searchCond = or(
          like(products.name, pattern),
          like(products.description, pattern)
        );
        if (searchCond) {
          conditions.push(searchCond);
        }
      }

      const baseQuery = db.select().from(products);
      return conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;
    },

    async findById(id: string): Promise<ProductRecord | null> {
      const [row] = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      return row ?? null;
    },

    async create(input: NewProductRecord): Promise<ProductRecord> {
      await db.insert(products).values(input);
      return {
        ...input,
        image_url: input.image_url ?? null,
        is_archived: input.is_archived ?? false,
      };
    },

    async update(
      id: string,
      input: { name: string; description: string; base_price: number }
    ): Promise<void> {
      await db.update(products).set(input).where(eq(products.id, id));
    },

    async updateArchived(id: string, isArchived: boolean): Promise<void> {
      await db
        .update(products)
        .set({ is_archived: isArchived })
        .where(eq(products.id, id));
    },

    async updateImageUrl(id: string, imageUrl: string): Promise<void> {
      await db
        .update(products)
        .set({ image_url: imageUrl })
        .where(eq(products.id, id));
    },
  };
}

export type ProductRepo = ReturnType<typeof createProductRepo>;
