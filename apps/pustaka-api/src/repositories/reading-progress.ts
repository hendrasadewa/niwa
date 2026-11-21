import { and, eq } from "drizzle-orm";
import { readingProgress, type Database } from "../db";

export type ReadingProgressRecord = typeof readingProgress.$inferSelect;
export type NewReadingProgressRecord = typeof readingProgress.$inferInsert;

export function createReadingProgressRepo(db: Database) {
  return {
    async findByUserAndBook(
      userId: string,
      bookId: string
    ): Promise<ReadingProgressRecord | null> {
      const [row] = await db
        .select()
        .from(readingProgress)
        .where(
          and(
            eq(readingProgress.user_id, userId),
            eq(readingProgress.book_id, bookId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async create(input: NewReadingProgressRecord): Promise<void> {
      await db.insert(readingProgress).values(input);
    },

    async update(
      id: string,
      lastPageRead: number,
      updatedAt: number
    ): Promise<void> {
      await db
        .update(readingProgress)
        .set({ last_page_read: lastPageRead, updated_at: updatedAt })
        .where(eq(readingProgress.id, id));
    },
  };
}

export type ReadingProgressRepo = ReturnType<typeof createReadingProgressRepo>;
