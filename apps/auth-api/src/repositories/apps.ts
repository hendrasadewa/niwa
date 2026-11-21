import { eq } from "drizzle-orm";
import { apps, type Database } from "../db";

export type AppRecord = typeof apps.$inferSelect;
export type NewAppRecord = typeof apps.$inferInsert;

export function createAppRepo(db: Database) {
  return {
    async findAll(appId?: string): Promise<AppRecord[]> {
      return appId
        ? db.select().from(apps).where(eq(apps.id, appId))
        : db.select().from(apps);
    },

    async findById(id: string): Promise<AppRecord | null> {
      const [row] = await db
        .select()
        .from(apps)
        .where(eq(apps.id, id))
        .limit(1);
      return row ?? null;
    },

    async create(input: NewAppRecord): Promise<AppRecord> {
      await db.insert(apps).values(input);
      return input;
    },
  };
}

export type AppRepo = ReturnType<typeof createAppRepo>;
