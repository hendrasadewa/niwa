import { and, desc, eq, isNull } from "drizzle-orm";
import { apps, userAppConsents, type Database } from "../db";

export type UserAppConsentRecord = typeof userAppConsents.$inferSelect;

export type ActiveUserAppConsentWithApp = {
  app_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  granted_scopes: string;
  consented_at: number;
};

export function createConsentRepo(db: Database) {
  return {
    async findByUserAndApp(
      userId: string,
      appId: string
    ): Promise<UserAppConsentRecord | null> {
      const [row] = await db
        .select()
        .from(userAppConsents)
        .where(
          and(
            eq(userAppConsents.user_id, userId),
            eq(userAppConsents.app_id, appId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async listActiveByUser(
      userId: string
    ): Promise<ActiveUserAppConsentWithApp[]> {
      return db
        .select({
          app_id: userAppConsents.app_id,
          name: apps.name,
          description: apps.description,
          icon_url: apps.icon_url,
          granted_scopes: userAppConsents.granted_scopes,
          consented_at: userAppConsents.consented_at,
        })
        .from(userAppConsents)
        .innerJoin(apps, eq(userAppConsents.app_id, apps.id))
        .where(
          and(
            eq(userAppConsents.user_id, userId),
            isNull(userAppConsents.revoked_at)
          )
        )
        .orderBy(desc(userAppConsents.consented_at));
    },

    async upsertApprove(input: {
      user_id: string;
      app_id: string;
      granted_scopes: string;
      consented_at: number;
    }): Promise<void> {
      await db
        .insert(userAppConsents)
        .values({
          user_id: input.user_id,
          app_id: input.app_id,
          granted_scopes: input.granted_scopes,
          consented_at: input.consented_at,
          revoked_at: null,
        })
        .onConflictDoUpdate({
          target: [userAppConsents.user_id, userAppConsents.app_id],
          set: {
            granted_scopes: input.granted_scopes,
            consented_at: input.consented_at,
            revoked_at: null,
          },
        });
    },

    async revoke(
      userId: string,
      appId: string,
      revokedAt: number
    ): Promise<boolean> {
      const [existing] = await db
        .select({ app_id: userAppConsents.app_id })
        .from(userAppConsents)
        .where(
          and(
            eq(userAppConsents.user_id, userId),
            eq(userAppConsents.app_id, appId),
            isNull(userAppConsents.revoked_at)
          )
        )
        .limit(1);

      if (!existing) return false;

      await db
        .update(userAppConsents)
        .set({ revoked_at: revokedAt })
        .where(
          and(
            eq(userAppConsents.user_id, userId),
            eq(userAppConsents.app_id, appId)
          )
        );
      return true;
    },
  };
}

export type ConsentRepo = ReturnType<typeof createConsentRepo>;
