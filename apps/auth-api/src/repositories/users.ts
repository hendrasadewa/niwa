import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { users, type Database } from "../db";

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;

export function createUserRepo(db: Database) {
  return {
    async findById(id: string): Promise<UserRecord | null> {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByEmail(email: string): Promise<UserRecord | null> {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return row ?? null;
    },

    async countAll(): Promise<number> {
      const [row] = await db.select({ value: count() }).from(users);
      return row?.value ?? 0;
    },

    async listFiltered(filters: {
      search?: string;
      isActive?: boolean;
    }): Promise<UserRecord[]> {
      const conditions: SQL[] = [];

      if (filters.search) {
        const pattern = `%${filters.search}%`;
        const searchCond = or(
          like(users.email, pattern),
          like(users.name, pattern),
          like(users.whatsapp_number, pattern)
        );
        if (searchCond) {
          conditions.push(searchCond);
        }
      }

      if (filters.isActive !== undefined) {
        conditions.push(eq(users.is_active, filters.isActive));
      }

      const baseQuery = db.select().from(users).orderBy(desc(users.created_at));
      return conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;
    },

    async create(input: NewUserRecord): Promise<UserRecord> {
      await db.insert(users).values(input);
      return {
        ...input,
        is_active: input.is_active ?? true,
      };
    },

    async updateProfile(
      id: string,
      input: { name: string; whatsapp_number: string; updated_at: number }
    ): Promise<void> {
      await db
        .update(users)
        .set({
          name: input.name,
          whatsapp_number: input.whatsapp_number,
          updated_at: input.updated_at,
        })
        .where(eq(users.id, id));
    },

    async updatePassword(
      id: string,
      input: { password_hash: string; updated_at: number }
    ): Promise<void> {
      await db
        .update(users)
        .set({
          password_hash: input.password_hash,
          updated_at: input.updated_at,
        })
        .where(eq(users.id, id));
    },

    async updateStatus(
      id: string,
      input: { is_active: boolean; updated_at: number }
    ): Promise<void> {
      await db
        .update(users)
        .set({
          is_active: input.is_active,
          updated_at: input.updated_at,
        })
        .where(eq(users.id, id));
    },
  };
}

export type UserRepo = ReturnType<typeof createUserRepo>;
