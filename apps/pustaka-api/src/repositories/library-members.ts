import { and, asc, eq } from "drizzle-orm";
import { libraryMembers, type Database } from "../db";

export type LibraryMemberRecord = typeof libraryMembers.$inferSelect;
export type NewLibraryMemberRecord = typeof libraryMembers.$inferInsert;

export function createLibraryMemberRepo(db: Database) {
  return {
    async findByLibraryAndUser(
      libraryId: string,
      userId: string
    ): Promise<LibraryMemberRecord | null> {
      const [row] = await db
        .select()
        .from(libraryMembers)
        .where(
          and(
            eq(libraryMembers.library_id, libraryId),
            eq(libraryMembers.user_id, userId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async listByLibrary(libraryId: string): Promise<LibraryMemberRecord[]> {
      return db
        .select()
        .from(libraryMembers)
        .where(eq(libraryMembers.library_id, libraryId))
        .orderBy(asc(libraryMembers.joined_at));
    },

    async listLibraryIdsForUser(userId: string): Promise<string[]> {
      const rows = await db
        .select({ library_id: libraryMembers.library_id })
        .from(libraryMembers)
        .where(eq(libraryMembers.user_id, userId));
      return rows.map((row) => row.library_id);
    },

    async deleteByLibraryAndUser(
      libraryId: string,
      userId: string
    ): Promise<void> {
      await db
        .delete(libraryMembers)
        .where(
          and(
            eq(libraryMembers.library_id, libraryId),
            eq(libraryMembers.user_id, userId)
          )
        );
    },
  };
}

export type LibraryMemberRepo = ReturnType<typeof createLibraryMemberRepo>;
