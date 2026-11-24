import { and, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import type { LibraryVisibility } from "@niwa/pustaka-validators";
import { books, bookshelves, libraries, type Database } from "../db";
import type { BookWithShelf } from "../types/library";

export type BookRecord = typeof books.$inferSelect;
export type NewBookRecord = typeof books.$inferInsert;

const bookWithShelfSelection = {
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
  bookshelf: {
    id: bookshelves.id,
    library_id: bookshelves.library_id,
    name: bookshelves.name,
    location: bookshelves.location,
    created_at: bookshelves.created_at,
  },
  library: {
    id: libraries.id,
    name: libraries.name,
    slug: libraries.slug,
    visibility: libraries.visibility,
  },
};

function mapBookRow(row: {
  id: string;
  library_id: string;
  title: string;
  author: string;
  isbn: string;
  total_pages: number;
  cover_image_key: string | null;
  bookshelf_id: string | null;
  owner_id: string | null;
  owner_name: string;
  created_at: number;
  bookshelf: {
    id: string;
    library_id: string;
    name: string;
    location: string;
    created_at: number;
  } | null;
  library: {
    id: string;
    name: string;
    slug: string;
    visibility: string;
  } | null;
}): BookWithShelf {
  return {
    ...row,
    library: row.library
      ? {
          ...row.library,
          visibility: row.library.visibility as LibraryVisibility,
        }
      : null,
  };
}

export function createBookRepo(db: Database) {
  return {
    async findAllWithShelf(filters: {
      search?: string;
      libraryId?: string;
      bookshelfId?: string;
      ownerId?: string;
      viewerUserId: string | null;
      memberLibraryIds: string[];
    }): Promise<BookWithShelf[]> {
      const accessParts: SQL[] = [eq(libraries.visibility, "public")];
      if (filters.viewerUserId) {
        accessParts.push(eq(libraries.owner_id, filters.viewerUserId));
        if (filters.memberLibraryIds.length > 0) {
          accessParts.push(inArray(libraries.id, filters.memberLibraryIds));
        }
      }

      const conditions: SQL[] = [];
      const accessCond = or(...accessParts);
      if (accessCond) conditions.push(accessCond);

      if (filters.libraryId) {
        conditions.push(eq(books.library_id, filters.libraryId));
      }

      if (filters.bookshelfId) {
        conditions.push(eq(books.bookshelf_id, filters.bookshelfId));
      }

      if (filters.ownerId) {
        conditions.push(eq(books.owner_id, filters.ownerId));
      }

      if (filters.search) {
        const pattern = `%${filters.search}%`;
        const searchCond = or(
          like(books.title, pattern),
          like(books.author, pattern),
          like(books.isbn, pattern),
          like(books.owner_name, pattern)
        );
        if (searchCond) {
          conditions.push(searchCond);
        }
      }

      const rows = await db
        .select(bookWithShelfSelection)
        .from(books)
        .innerJoin(libraries, eq(books.library_id, libraries.id))
        .leftJoin(bookshelves, eq(books.bookshelf_id, bookshelves.id))
        .where(and(...conditions))
        .orderBy(desc(books.created_at), desc(sql`${books}.rowid`));

      return rows.map(mapBookRow);
    },

    async findByIdWithShelf(id: string): Promise<BookWithShelf | null> {
      const [row] = await db
        .select(bookWithShelfSelection)
        .from(books)
        .innerJoin(libraries, eq(books.library_id, libraries.id))
        .leftJoin(bookshelves, eq(books.bookshelf_id, bookshelves.id))
        .where(eq(books.id, id))
        .limit(1);
      return row ? mapBookRow(row) : null;
    },

    async findById(id: string): Promise<BookRecord | null> {
      const [row] = await db
        .select()
        .from(books)
        .where(eq(books.id, id))
        .limit(1);
      return row ?? null;
    },

    async countByLibrary(libraryId: string): Promise<number> {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(books)
        .where(eq(books.library_id, libraryId));
      return Number(row?.count ?? 0);
    },

    async create(input: NewBookRecord): Promise<BookRecord> {
      await db.insert(books).values(input);
      return {
        ...input,
        cover_image_key: input.cover_image_key ?? null,
        bookshelf_id: input.bookshelf_id ?? null,
        owner_id: input.owner_id ?? null,
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
        bookshelf_id: string | null;
        owner_id: string | null;
        owner_name: string;
      }
    ): Promise<void> {
      await db.update(books).set(input).where(eq(books.id, id));
    },

    async updateLocation(
      id: string,
      bookshelfId: string | null
    ): Promise<void> {
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
