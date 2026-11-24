import { desc, eq, sql } from "drizzle-orm";
import { libraryInvites, libraryMembers, type Database } from "../db";
import type { NewLibraryMemberRecord } from "./library-members";

export type LibraryInviteRecord = typeof libraryInvites.$inferSelect;
export type NewLibraryInviteRecord = typeof libraryInvites.$inferInsert;

export function createLibraryInviteRepo(db: Database) {
  return {
    async findById(id: string): Promise<LibraryInviteRecord | null> {
      const [row] = await db
        .select()
        .from(libraryInvites)
        .where(eq(libraryInvites.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByCode(code: string): Promise<LibraryInviteRecord | null> {
      const [row] = await db
        .select()
        .from(libraryInvites)
        .where(eq(libraryInvites.code, code))
        .limit(1);
      return row ?? null;
    },

    async listByLibrary(libraryId: string): Promise<LibraryInviteRecord[]> {
      return db
        .select()
        .from(libraryInvites)
        .where(eq(libraryInvites.library_id, libraryId))
        .orderBy(desc(libraryInvites.created_at));
    },

    async create(input: NewLibraryInviteRecord): Promise<LibraryInviteRecord> {
      await db.insert(libraryInvites).values(input);
      return {
        ...input,
        max_uses: input.max_uses ?? null,
        uses_count: input.uses_count ?? 0,
        expires_at: input.expires_at ?? null,
        revoked_at: input.revoked_at ?? null,
        created_at: input.created_at ?? 0,
      };
    },

    async revoke(id: string, revokedAt: number): Promise<void> {
      await db
        .update(libraryInvites)
        .set({ revoked_at: revokedAt })
        .where(eq(libraryInvites.id, id));
    },

    async acceptInviteAtomic(input: {
      inviteId: string;
      member: NewLibraryMemberRecord;
    }): Promise<void> {
      await db.batch([
        db.insert(libraryMembers).values(input.member),
        db
          .update(libraryInvites)
          .set({
            uses_count: sql`${libraryInvites.uses_count} + 1`,
          })
          .where(eq(libraryInvites.id, input.inviteId)),
      ]);
    },
  };
}

export type LibraryInviteRepo = ReturnType<typeof createLibraryInviteRepo>;
