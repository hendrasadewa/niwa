import { and, desc, eq, isNull } from "drizzle-orm";
import { verificationTokens, type Database } from "../db";

export type VerificationTokenPurpose = "email_verify" | "password_reset";
export type VerificationTokenRecord = typeof verificationTokens.$inferSelect;
export type NewVerificationTokenRecord = typeof verificationTokens.$inferInsert;

export function createVerificationTokenRepo(db: Database) {
  return {
    async create(input: NewVerificationTokenRecord): Promise<void> {
      await db.insert(verificationTokens).values(input);
    },

    async findByTokenHash(
      tokenHash: string
    ): Promise<VerificationTokenRecord | null> {
      const [row] = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.token_hash, tokenHash))
        .limit(1);
      return row ?? null;
    },

    async findLatestByUserAndPurpose(
      userId: string,
      purpose: VerificationTokenPurpose
    ): Promise<VerificationTokenRecord | null> {
      const [row] = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.user_id, userId),
            eq(verificationTokens.purpose, purpose)
          )
        )
        .orderBy(desc(verificationTokens.created_at))
        .limit(1);
      return row ?? null;
    },

    async invalidateActiveForUserAndPurpose(
      userId: string,
      purpose: VerificationTokenPurpose,
      now: number
    ): Promise<void> {
      await db
        .update(verificationTokens)
        .set({ consumed_at: now })
        .where(
          and(
            eq(verificationTokens.user_id, userId),
            eq(verificationTokens.purpose, purpose),
            isNull(verificationTokens.consumed_at)
          )
        );
    },

    async markConsumed(id: string, consumedAt: number): Promise<void> {
      await db
        .update(verificationTokens)
        .set({ consumed_at: consumedAt })
        .where(eq(verificationTokens.id, id));
    },
  };
}

export type VerificationTokenRepo = ReturnType<
  typeof createVerificationTokenRepo
>;
