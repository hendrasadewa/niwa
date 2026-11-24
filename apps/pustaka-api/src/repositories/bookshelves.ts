import { and, asc, eq, inArray, or, type SQL } from "drizzle-orm";
import { bookshelves, libraries, type Database } from "../db";

export type BookshelfRecord = typeof bookshelves.$inferSelect;
export type NewBookshelfRecord = typeof bookshelves.$inferInsert;

export function createBookshelfRepo(db: Database) {
  return {
    async findAccessible(filters: {
      libraryId?: string;
      viewerUserId: string | null;
      memberLibraryIds: string[];
    }): Promise<BookshelfRecord[]> {
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
        conditions.push(eq(bookshelves.library_id, filters.libraryId));
      }

      return db
        .select({
          id: bookshelves.id,
          library_id: bookshelves.library_id,
          name: bookshelves.name,
          location: bookshelves.location,
          created_at: bookshelves.created_at,
        })
        .from(bookshelves)
        .innerJoin(libraries, eq(bookshelves.library_id, libraries.id))
        .where(and(...conditions))
        .orderBy(asc(bookshelves.name));
    },

    async findByLibrary(libraryId: string): Promise<BookshelfRecord[]> {
      return db
        .select()
        .from(bookshelves)
        .where(eq(bookshelves.library_id, libraryId))
        .orderBy(asc(bookshelves.name));
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
      return {
        ...input,
        created_at: input.created_at ?? 0,
      };
    },

    async update(
      id: string,
      input: { name: string; location: string }
    ): Promise<void> {
      await db.update(bookshelves).set(input).where(eq(bookshelves.id, id));
    },

    async deleteById(id: string): Promise<void> {
      await db.delete(bookshelves).where(eq(bookshelves.id, id));
    },
  };
}

export type BookshelfRepo = ReturnType<typeof createBookshelfRepo>;
