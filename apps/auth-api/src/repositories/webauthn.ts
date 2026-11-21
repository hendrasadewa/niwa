import { and, desc, eq } from "drizzle-orm";
import {
  webauthnChallenges,
  webauthnCredentials,
  type Database,
} from "../db";

export type WebAuthnCredentialRecord =
  typeof webauthnCredentials.$inferSelect;
export type NewWebAuthnCredentialRecord =
  typeof webauthnCredentials.$inferInsert;
export type WebAuthnChallengeRecord = typeof webauthnChallenges.$inferSelect;
export type NewWebAuthnChallengeRecord =
  typeof webauthnChallenges.$inferInsert;

export function createWebAuthnRepo(db: Database) {
  return {
    async listCredentialsByUser(
      userId: string
    ): Promise<WebAuthnCredentialRecord[]> {
      return db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.user_id, userId))
        .orderBy(desc(webauthnCredentials.created_at));
    },

    async findCredentialById(
      id: string
    ): Promise<WebAuthnCredentialRecord | null> {
      const [row] = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.id, id))
        .limit(1);
      return row ?? null;
    },

    async findCredentialByIdAndUser(
      id: string,
      userId: string
    ): Promise<WebAuthnCredentialRecord | null> {
      const [row] = await db
        .select()
        .from(webauthnCredentials)
        .where(
          and(
            eq(webauthnCredentials.id, id),
            eq(webauthnCredentials.user_id, userId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async createCredential(
      input: NewWebAuthnCredentialRecord
    ): Promise<WebAuthnCredentialRecord> {
      await db.insert(webauthnCredentials).values(input);
      return {
        ...input,
        counter: input.counter ?? 0,
        transports: input.transports ?? "[]",
        backed_up: input.backed_up ?? false,
        last_used_at: input.last_used_at ?? null,
      };
    },

    async updateCounterAndLastUsed(
      id: string,
      input: { counter: number; last_used_at: number }
    ): Promise<void> {
      await db
        .update(webauthnCredentials)
        .set({
          counter: input.counter,
          last_used_at: input.last_used_at,
        })
        .where(eq(webauthnCredentials.id, id));
    },

    async renameCredentialForUser(
      id: string,
      userId: string,
      name: string
    ): Promise<boolean> {
      const existing = await this.findCredentialByIdAndUser(id, userId);
      if (!existing) return false;
      await db
        .update(webauthnCredentials)
        .set({ name })
        .where(
          and(
            eq(webauthnCredentials.id, id),
            eq(webauthnCredentials.user_id, userId)
          )
        );
      return true;
    },

    async deleteCredentialForUser(
      id: string,
      userId: string
    ): Promise<boolean> {
      const existing = await this.findCredentialByIdAndUser(id, userId);
      if (!existing) return false;
      await db
        .delete(webauthnCredentials)
        .where(
          and(
            eq(webauthnCredentials.id, id),
            eq(webauthnCredentials.user_id, userId)
          )
        );
      return true;
    },

    async createChallenge(input: NewWebAuthnChallengeRecord): Promise<void> {
      await db.insert(webauthnChallenges).values(input);
    },

    async findChallengeById(
      id: string
    ): Promise<WebAuthnChallengeRecord | null> {
      const [row] = await db
        .select()
        .from(webauthnChallenges)
        .where(eq(webauthnChallenges.id, id))
        .limit(1);
      return row ?? null;
    },

    async markChallengeConsumed(
      id: string,
      consumedAt: number
    ): Promise<void> {
      await db
        .update(webauthnChallenges)
        .set({ consumed_at: consumedAt })
        .where(eq(webauthnChallenges.id, id));
    },
  };
}

export type WebAuthnRepo = ReturnType<typeof createWebAuthnRepo>;
