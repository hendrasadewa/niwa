import { and, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import {
  books,
  bookshelves,
  libraries,
  libraryMembers,
  type Database,
} from "../db";

export type LibraryRecord = typeof libraries.$inferSelect;
export type NewLibraryRecord = typeof libraries.$inferInsert;

export type LibraryCounts = {
  bookCounts: Map<string, number>;
  bookshelfCounts: Map<string, number>;
  memberCounts: Map<string, number>;
};

export function createLibraryRepo(db: Database) {
  function buildSearchCondition(search?: string): SQL | undefined {
    if (!search) return undefined;
    const pattern = `%${search}%`;
    return or(
      like(libraries.name, pattern),
      like(libraries.slug, pattern),
      like(libraries.description, pattern)
    );
  }

  return {
    async findById(id: string): Promise<LibraryRecord | null> {
      const [row] = await db
        .select()
        .from(libraries)
        .where(eq(libraries.id, id))
        .limit(1);
      return row ?? null;
    },

    async findBySlug(slug: string): Promise<LibraryRecord | null> {
      const [row] = await db
        .select()
        .from(libraries)
        .where(eq(libraries.slug, slug))
        .limit(1);
      return row ?? null;
    },

    async findByIdOrSlug(identifier: string): Promise<LibraryRecord | null> {
      const [row] = await db
        .select()
        .from(libraries)
        .where(or(eq(libraries.id, identifier), eq(libraries.slug, identifier)))
        .limit(1);
      return row ?? null;
    },

    async listMine(
      userId: string,
      memberLibraryIds: string[],
      search?: string
    ): Promise<LibraryRecord[]> {
      const accessCond =
        memberLibraryIds.length > 0
          ? or(
              eq(libraries.owner_id, userId),
              inArray(libraries.id, memberLibraryIds)
            )
          : eq(libraries.owner_id, userId);

      const conditions: SQL[] = [];
      if (accessCond) conditions.push(accessCond);
      const searchCond = buildSearchCondition(search);
      if (searchCond) conditions.push(searchCond);

      return db
        .select()
        .from(libraries)
        .where(and(...conditions))
        .orderBy(desc(libraries.updated_at), desc(libraries.created_at));
    },

    async listPublic(search?: string): Promise<LibraryRecord[]> {
      const conditions: SQL[] = [eq(libraries.visibility, "public")];
      const searchCond = buildSearchCondition(search);
      if (searchCond) conditions.push(searchCond);

      return db
        .select()
        .from(libraries)
        .where(and(...conditions))
        .orderBy(desc(libraries.updated_at), desc(libraries.created_at));
    },

    async listAccessible(
      userId: string | null,
      memberLibraryIds: string[],
      search?: string
    ): Promise<LibraryRecord[]> {
      const accessParts: SQL[] = [eq(libraries.visibility, "public")];
      if (userId) {
        accessParts.push(eq(libraries.owner_id, userId));
        if (memberLibraryIds.length > 0) {
          accessParts.push(inArray(libraries.id, memberLibraryIds));
        }
      }

      const conditions: SQL[] = [];
      const accessCond = or(...accessParts);
      if (accessCond) conditions.push(accessCond);
      const searchCond = buildSearchCondition(search);
      if (searchCond) conditions.push(searchCond);

      return db
        .select()
        .from(libraries)
        .where(and(...conditions))
        .orderBy(desc(libraries.updated_at), desc(libraries.created_at));
    },

    async getCountsByLibraryIds(libraryIds: string[]): Promise<LibraryCounts> {
      const bookCounts = new Map<string, number>();
      const bookshelfCounts = new Map<string, number>();
      const memberCounts = new Map<string, number>();

      if (libraryIds.length === 0) {
        return { bookCounts, bookshelfCounts, memberCounts };
      }

      const [bookRows, shelfRows, memberRows] = await Promise.all([
        db
          .select({
            library_id: books.library_id,
            count: sql<number>`count(*)`,
          })
          .from(books)
          .where(inArray(books.library_id, libraryIds))
          .groupBy(books.library_id),
        db
          .select({
            library_id: bookshelves.library_id,
            count: sql<number>`count(*)`,
          })
          .from(bookshelves)
          .where(inArray(bookshelves.library_id, libraryIds))
          .groupBy(bookshelves.library_id),
        db
          .select({
            library_id: libraryMembers.library_id,
            count: sql<number>`count(*)`,
          })
          .from(libraryMembers)
          .where(inArray(libraryMembers.library_id, libraryIds))
          .groupBy(libraryMembers.library_id),
      ]);

      for (const row of bookRows) {
        bookCounts.set(row.library_id, Number(row.count));
      }
      for (const row of shelfRows) {
        bookshelfCounts.set(row.library_id, Number(row.count));
      }
      for (const row of memberRows) {
        memberCounts.set(row.library_id, Number(row.count));
      }

      return { bookCounts, bookshelfCounts, memberCounts };
    },

    async create(input: NewLibraryRecord): Promise<LibraryRecord> {
      await db.insert(libraries).values(input);
      return {
        ...input,
        description: input.description ?? null,
        visibility: input.visibility ?? "private",
        created_at: input.created_at ?? 0,
        updated_at: input.updated_at ?? 0,
      };
    },

    async update(
      id: string,
      input: {
        name: string;
        slug: string;
        description: string | null;
        visibility: string;
        updated_at: number;
      }
    ): Promise<void> {
      await db.update(libraries).set(input).where(eq(libraries.id, id));
    },

    async deleteById(id: string): Promise<void> {
      await db.delete(libraries).where(eq(libraries.id, id));
    },

    async transferOwnershipAtomic(input: {
      libraryId: string;
      previousOwnerId: string;
      previousOwnerName: string;
      newOwnerId: string;
      newOwnerName: string;
      previousOwnerMemberId: string;
      now: number;
    }): Promise<void> {
      await db.batch([
        db
          .update(libraries)
          .set({
            owner_id: input.newOwnerId,
            owner_name: input.newOwnerName,
            updated_at: input.now,
          })
          .where(eq(libraries.id, input.libraryId)),
        db
          .delete(libraryMembers)
          .where(
            and(
              eq(libraryMembers.library_id, input.libraryId),
              eq(libraryMembers.user_id, input.newOwnerId)
            )
          ),
        db.insert(libraryMembers).values({
          id: input.previousOwnerMemberId,
          library_id: input.libraryId,
          user_id: input.previousOwnerId,
          username: input.previousOwnerName,
          joined_at: input.now,
        }),
      ]);
    },
  };
}

export type LibraryRepo = ReturnType<typeof createLibraryRepo>;
