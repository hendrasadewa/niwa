import { eq } from "drizzle-orm";
import { bookshelves, type Database } from "../db";

export type BookshelfRecord = typeof bookshelves.$inferSelect;
export type NewBookshelfRecord = typeof bookshelves.$inferInsert;

export function createBookshelfRepo(db: Database) {
  return {
    async findAll(): Promise<BookshelfRecord[]> {
      return db.select().from(bookshelves);
    },

    async findById(id: string): Promise<BookshelfRecord | null> {
      const [row] = await db
        .select()
        .from(bookshelves)
        .where(eq(bookshelves.id, id))
        .limit(1);
      return row ?? null;
    },

    async create(input: NewBookshelfRecord): Promise<BookshelfRecord> {
      await db.insert(bookshelves).values(input);
      return input;
    },
  };
}

export type BookshelfRepo = ReturnType<typeof createBookshelfRepo>;
