import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { books, libraries, readingLists, type Database } from "../db";
import type { ReadingListWithBook } from "../types/library";

export type ReadingListRecord = typeof readingLists.$inferSelect;
export type NewReadingListRecord = typeof readingLists.$inferInsert;

export function createReadingListRepo(db: Database) {
  return {
    async listByUserWithBook(
      userId: string,
      memberLibraryIds: string[]
    ): Promise<ReadingListWithBook[]> {
      const accessParts: SQL[] = [
        eq(libraries.visibility, "public"),
        eq(libraries.owner_id, userId),
      ];
      if (memberLibraryIds.length > 0) {
        accessParts.push(inArray(libraries.id, memberLibraryIds));
      }

      return db
        .select({
          id: readingLists.id,
          user_id: readingLists.user_id,
          book_id: readingLists.book_id,
          status: readingLists.status,
          updated_at: readingLists.updated_at,
          book: {
            id: books.id,
            library_id: books.library_id,
            title: books.title,
            author: books.author,
            isbn: books.isbn,
            total_pages: books.total_pages,
            cover_image_key: books.cover_image_key,
            bookshelf_id: books.bookshelf_id,
            owner_id: books.owner_id,
            owner_name: books.owner_name,
            created_at: books.created_at,
          },
        })
        .from(readingLists)
        .innerJoin(books, eq(readingLists.book_id, books.id))
        .innerJoin(libraries, eq(books.library_id, libraries.id))
        .where(and(eq(readingLists.user_id, userId), or(...accessParts)));
    },

    async findByUserAndBook(
      userId: string,
      bookId: string
    ): Promise<ReadingListRecord | null> {
      const [row] = await db
        .select()
        .from(readingLists)
        .where(
          and(
            eq(readingLists.user_id, userId),
            eq(readingLists.book_id, bookId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async create(input: NewReadingListRecord): Promise<ReadingListRecord> {
      await db.insert(readingLists).values(input);
      return input;
    },

    async updateStatus(
      id: string,
      status: string,
      updatedAt: number
    ): Promise<void> {
      await db
        .update(readingLists)
        .set({ status, updated_at: updatedAt })
        .where(eq(readingLists.id, id));
    },
  };
}

export type ReadingListRepo = ReturnType<typeof createReadingListRepo>;
