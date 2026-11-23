import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { books, bookshelves, type Database } from "../db";
import type { BookWithShelf } from "../types/library";

export type BookRecord = typeof books.$inferSelect;
export type NewBookRecord = typeof books.$inferInsert;

const bookWithShelfSelection = {
  id: books.id,
  title: books.title,
  author: books.author,
  isbn: books.isbn,
  total_pages: books.total_pages,
  cover_image_key: books.cover_image_key,
  bookshelf_id: books.bookshelf_id,
  created_at: books.created_at,
  bookshelf: {
    id: bookshelves.id,
    name: bookshelves.name,
    location: bookshelves.location,
  },
};

export function createBookRepo(db: Database) {
  return {
    async findAllWithShelf(filters: {
      search?: string;
      bookshelfId?: string;
    }): Promise<BookWithShelf[]> {
      const conditions: SQL[] = [];

      if (filters.bookshelfId) {
        conditions.push(eq(books.bookshelf_id, filters.bookshelfId));
      }

      if (filters.search) {
        const pattern = `%${filters.search}%`;
        const searchCond = or(
          like(books.title, pattern),
          like(books.author, pattern),
          like(books.isbn, pattern)
        );
        if (searchCond) {
          conditions.push(searchCond);
        }
      }

      const baseQuery = db
        .select(bookWithShelfSelection)
        .from(books)
        .leftJoin(bookshelves, eq(books.bookshelf_id, bookshelves.id));

      return (
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery
      ).orderBy(desc(books.created_at), desc(sql`${books}.rowid`));
    },

    async findByIdWithShelf(id: string): Promise<BookWithShelf | null> {
      const [row] = await db
        .select(bookWithShelfSelection)
        .from(books)
        .leftJoin(bookshelves, eq(books.bookshelf_id, bookshelves.id))
        .where(eq(books.id, id))
        .limit(1);
      return row ?? null;
    },

    async findById(id: string): Promise<BookRecord | null> {
      const [row] = await db
        .select()
        .from(books)
        .where(eq(books.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByIsbn(isbn: string): Promise<BookRecord | null> {
      const [row] = await db
        .select()
        .from(books)
        .where(eq(books.isbn, isbn))
        .limit(1);
      return row ?? null;
    },

    async create(input: NewBookRecord): Promise<BookRecord> {
      await db.insert(books).values(input);
      return {
        ...input,
        cover_image_key: input.cover_image_key ?? null,
        created_at: input.created_at ?? 0,
      };
    },

    async update(
      id: string,
      input: {
        title: string;
        author: string;
        isbn: string;
        total_pages: number;
        bookshelf_id: string;
      }
    ): Promise<void> {
      await db.update(books).set(input).where(eq(books.id, id));
    },

    async updateLocation(id: string, bookshelfId: string): Promise<void> {
      await db
        .update(books)
        .set({ bookshelf_id: bookshelfId })
        .where(eq(books.id, id));
    },

    async updateCoverKey(id: string, coverImageKey: string): Promise<void> {
      await db
        .update(books)
        .set({ cover_image_key: coverImageKey })
        .where(eq(books.id, id));
    },

    async deleteById(id: string): Promise<void> {
      await db.delete(books).where(eq(books.id, id));
    },
  };
}

export type BookRepo = ReturnType<typeof createBookRepo>;
