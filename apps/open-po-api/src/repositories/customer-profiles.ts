import { eq } from "drizzle-orm";
import { customerProfiles, type Database } from "../db";

export function createCustomerProfileRepo(db: Database) {
  return {
    async findShippingAddress(userId: string): Promise<string | null> {
      const [row] = await db
        .select({
          default_shipping_address: customerProfiles.default_shipping_address,
        })
        .from(customerProfiles)
        .where(eq(customerProfiles.user_id, userId))
        .limit(1);
      return row?.default_shipping_address ?? null;
    },

    async upsertShippingAddress(
      userId: string,
      defaultShippingAddress: string | null,
      updatedAt: number
    ): Promise<void> {
      await db
        .insert(customerProfiles)
        .values({
          user_id: userId,
          default_shipping_address: defaultShippingAddress,
          updated_at: updatedAt,
        })
        .onConflictDoUpdate({
          target: customerProfiles.user_id,
          set: {
            default_shipping_address: defaultShippingAddress,
            updated_at: updatedAt,
          },
        });
    },
  };
}

export type CustomerProfileRepo = ReturnType<typeof createCustomerProfileRepo>;
