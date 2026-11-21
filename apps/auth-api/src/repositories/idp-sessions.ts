import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { idpSessions, type Database } from "../db";

export type IdpSessionRecord = typeof idpSessions.$inferSelect;
export type NewIdpSessionRecord = typeof idpSessions.$inferInsert;

export function createIdpSessionRepo(db: Database) {
  return {
    async create(input: NewIdpSessionRecord): Promise<IdpSessionRecord> {
      await db.insert(idpSessions).values(input);
      return {
        ...input,
        amr: input.amr ?? '["pwd"]',
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
        revoked_at: input.revoked_at ?? null,
      };
    },

    async findBySessionHash(
      sessionHash: string
    ): Promise<IdpSessionRecord | null> {
      const [row] = await db
        .select()
        .from(idpSessions)
        .where(eq(idpSessions.session_hash, sessionHash))
        .limit(1);
      return row ?? null;
    },

    async findById(id: string): Promise<IdpSessionRecord | null> {
      const [row] = await db
        .select()
        .from(idpSessions)
        .where(eq(idpSessions.id, id))
        .limit(1);
      return row ?? null;
    },

    async listActiveByUser(
      userId: string,
      now: number
    ): Promise<IdpSessionRecord[]> {
      return db
        .select()
        .from(idpSessions)
        .where(
          and(
            eq(idpSessions.user_id, userId),
            isNull(idpSessions.revoked_at),
            gt(idpSessions.expires_at, now)
          )
        )
        .orderBy(desc(idpSessions.last_seen_at));
    },

    async touchLastSeen(
      id: string,
      lastSeenAt: number,
      expiresAt: number
    ): Promise<void> {
      await db
        .update(idpSessions)
        .set({
          last_seen_at: lastSeenAt,
          expires_at: expiresAt,
        })
        .where(eq(idpSessions.id, id));
    },

    async revokeById(id: string, revokedAt: number): Promise<void> {
      await db
        .update(idpSessions)
        .set({ revoked_at: revokedAt })
        .where(and(eq(idpSessions.id, id), isNull(idpSessions.revoked_at)));
    },

    async revokeForUserById(
      userId: string,
      sessionId: string,
      revokedAt: number
    ): Promise<boolean> {
      const [existing] = await db
        .select({ id: idpSessions.id })
        .from(idpSessions)
        .where(
          and(
            eq(idpSessions.id, sessionId),
            eq(idpSessions.user_id, userId),
            isNull(idpSessions.revoked_at)
          )
        )
        .limit(1);

      if (!existing) return false;

      await db
        .update(idpSessions)
        .set({ revoked_at: revokedAt })
        .where(
          and(eq(idpSessions.id, sessionId), eq(idpSessions.user_id, userId))
        );
      return true;
    },

    async revokeAllForUser(userId: string, revokedAt: number): Promise<number> {
      const active = await db
        .select({ id: idpSessions.id })
        .from(idpSessions)
        .where(
          and(eq(idpSessions.user_id, userId), isNull(idpSessions.revoked_at))
        );

      if (active.length === 0) return 0;

      await db
        .update(idpSessions)
        .set({ revoked_at: revokedAt })
        .where(
          and(eq(idpSessions.user_id, userId), isNull(idpSessions.revoked_at))
        );
      return active.length;
    },

    async revokeAllExcept(
      userId: string,
      exceptSessionId: string,
      revokedAt: number
    ): Promise<number> {
      const active = await db
        .select({ id: idpSessions.id })
        .from(idpSessions)
        .where(
          and(
            eq(idpSessions.user_id, userId),
            ne(idpSessions.id, exceptSessionId),
            isNull(idpSessions.revoked_at)
          )
        );

      if (active.length === 0) return 0;

      await db
        .update(idpSessions)
        .set({ revoked_at: revokedAt })
        .where(
          and(
            eq(idpSessions.user_id, userId),
            ne(idpSessions.id, exceptSessionId),
            isNull(idpSessions.revoked_at)
          )
        );
      return active.length;
    },
  };
}

export type IdpSessionRepo = ReturnType<typeof createIdpSessionRepo>;
