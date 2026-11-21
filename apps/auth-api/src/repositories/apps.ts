import { eq } from "drizzle-orm";
import { apps, type Database } from "../db";
import { parseJsonStringArray } from "../utils/origin";

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
      return {
        id: input.id,
        name: input.name,
        description: input.description,
        allowed_origins: input.allowed_origins ?? "[]",
        allowed_redirect_uris: input.allowed_redirect_uris ?? "[]",
        default_role_name: input.default_role_name ?? null,
        require_consent: input.require_consent ?? true,
        icon_url: input.icon_url ?? null,
      };
    },

    async update(
      id: string,
      patch: Partial<Omit<NewAppRecord, "id">>
    ): Promise<AppRecord | null> {
      await db.update(apps).set(patch).where(eq(apps.id, id));
      const [row] = await db
        .select()
        .from(apps)
        .where(eq(apps.id, id))
        .limit(1);
      return row ?? null;
    },

    async listAllAllowedOrigins(): Promise<string[]> {
      const rows = await db
        .select({ allowed_origins: apps.allowed_origins })
        .from(apps);
      const result: string[] = [];
      for (const row of rows) {
        result.push(...parseJsonStringArray(row.allowed_origins));
      }
      return result;
    },
  };
}

export type AppRepo = ReturnType<typeof createAppRepo>;
