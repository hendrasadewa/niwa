import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { refreshTokens, type Database } from "../db";
import type { ActiveSessionResponse } from "../types/auth";

export type RefreshTokenRecord = typeof refreshTokens.$inferSelect;
export type NewRefreshTokenRecord = typeof refreshTokens.$inferInsert;

export function createRefreshTokenRepo(db: Database) {
  return {
    async create(record: NewRefreshTokenRecord): Promise<void> {
      await db.insert(refreshTokens).values(record);
    },

    async findByTokenHash(
      tokenHash: string
    ): Promise<RefreshTokenRecord | null> {
      const [row] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token_hash, tokenHash))
        .limit(1);
      return row ?? null;
    },

    async revokeById(id: string, revokedAt: number): Promise<void> {
      await db
        .update(refreshTokens)
        .set({ revoked_at: revokedAt })
        .where(eq(refreshTokens.id, id));
    },

    async rotateAtomically(
      previousId: string,
      nextRecord: NewRefreshTokenRecord,
      revokedAt: number
    ): Promise<void> {
      await db.batch([
        db.insert(refreshTokens).values(nextRecord),
        db
          .update(refreshTokens)
          .set({
            revoked_at: revokedAt,
            replaced_by_id: nextRecord.id,
          })
          .where(eq(refreshTokens.id, previousId)),
      ]);
    },

    async revokeFamily(familyId: string, revokedAt: number): Promise<void> {
      await db
        .update(refreshTokens)
        .set({ revoked_at: revokedAt })
        .where(
          and(
            eq(refreshTokens.family_id, familyId),
            isNull(refreshTokens.revoked_at)
          )
        );
    },

    async revokeAllForUser(userId: string, revokedAt: number): Promise<number> {
      const activeTokens = await db
        .select({ id: refreshTokens.id })
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.user_id, userId),
            isNull(refreshTokens.revoked_at)
          )
        );

      if (activeTokens.length === 0) {
        return 0;
      }

      await db
        .update(refreshTokens)
        .set({ revoked_at: revokedAt })
        .where(
          and(
            eq(refreshTokens.user_id, userId),
            isNull(refreshTokens.revoked_at)
          )
        );

      return activeTokens.length;
    },

    async listActiveByUser(
      userId: string,
      now: number
    ): Promise<ActiveSessionResponse[]> {
      return db
        .select({
          id: refreshTokens.id,
          family_id: refreshTokens.family_id,
          user_agent: refreshTokens.user_agent,
          created_at: refreshTokens.created_at,
          expires_at: refreshTokens.expires_at,
        })
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.user_id, userId),
            isNull(refreshTokens.revoked_at),
            gt(refreshTokens.expires_at, now)
          )
        )
        .orderBy(desc(refreshTokens.created_at));
    },

    async countActiveByUser(userId: string, now: number): Promise<number> {
      const rows = await db
        .select({ id: refreshTokens.id })
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.user_id, userId),
            isNull(refreshTokens.revoked_at),
            gt(refreshTokens.expires_at, now)
          )
        );
      return rows.length;
    },
  };
}

export type RefreshTokenRepo = ReturnType<typeof createRefreshTokenRepo>;
