import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import {
  orderItems,
  preOrderWaves,
  products,
  waveProducts,
  type Database,
} from "../db";

export type WaveRecord = typeof preOrderWaves.$inferSelect;
export type NewWaveRecord = typeof preOrderWaves.$inferInsert;
export type WaveProductRecord = typeof waveProducts.$inferSelect;
export type NewWaveProductRecord = typeof waveProducts.$inferInsert;

export function createWaveRepo(db: Database) {
  return {
    async findAll(filters: {
      storeId?: string;
      status?: string;
    }): Promise<WaveRecord[]> {
      const conditions: SQL[] = [];
      if (filters.storeId) {
        conditions.push(eq(preOrderWaves.store_id, filters.storeId));
      }
      if (filters.status) {
        conditions.push(eq(preOrderWaves.status, filters.status));
      }

      const baseQuery = db
        .select()
        .from(preOrderWaves)
        .orderBy(desc(preOrderWaves.start_date));

      return conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;
    },

    async findById(id: string): Promise<WaveRecord | null> {
      const [row] = await db
        .select()
        .from(preOrderWaves)
        .where(eq(preOrderWaves.id, id))
        .limit(1);
      return row ?? null;
    },

    async create(input: NewWaveRecord): Promise<WaveRecord> {
      await db.insert(preOrderWaves).values(input);
      return {
        ...input,
        status: input.status ?? "Draft",
      };
    },

    async update(
      id: string,
      input: { name: string; start_date: number; end_date: number }
    ): Promise<void> {
      await db
        .update(preOrderWaves)
        .set(input)
        .where(eq(preOrderWaves.id, id));
    },

    async updateStatus(id: string, status: string): Promise<void> {
      await db
        .update(preOrderWaves)
        .set({ status })
        .where(eq(preOrderWaves.id, id));
    },

    async findWaveProductByWaveAndProduct(
      waveId: string,
      productId: string
    ): Promise<WaveProductRecord | null> {
      const [row] = await db
        .select()
        .from(waveProducts)
        .where(
          and(
            eq(waveProducts.wave_id, waveId),
            eq(waveProducts.product_id, productId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async findWaveProductByIdAndWave(
      waveProductId: string,
      waveId: string
    ): Promise<WaveProductRecord | null> {
      const [row] = await db
        .select()
        .from(waveProducts)
        .where(
          and(
            eq(waveProducts.id, waveProductId),
            eq(waveProducts.wave_id, waveId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async findWaveProductsWithProductByIds(waveId: string, ids: string[]) {
      if (ids.length === 0) return [];
      return db
        .select({
          id: waveProducts.id,
          wave_id: waveProducts.wave_id,
          product_id: waveProducts.product_id,
          locked_price: waveProducts.locked_price,
          quota: waveProducts.quota,
          product_name: products.name,
        })
        .from(waveProducts)
        .innerJoin(products, eq(waveProducts.product_id, products.id))
        .where(
          and(eq(waveProducts.wave_id, waveId), inArray(waveProducts.id, ids))
        );
    },

    async createWaveProduct(
      input: NewWaveProductRecord
    ): Promise<WaveProductRecord> {
      await db.insert(waveProducts).values(input);
      return {
        ...input,
        quota: input.quota ?? null,
      };
    },

    async updateWaveProduct(
      id: string,
      input: { locked_price: number; quota: number | null }
    ): Promise<void> {
      await db.update(waveProducts).set(input).where(eq(waveProducts.id, id));
    },

    async deleteWaveProduct(id: string): Promise<void> {
      await db.delete(waveProducts).where(eq(waveProducts.id, id));
    },

    async getOrderedTotalsByWaveProductIds(
      waveProductIds: string[]
    ): Promise<Map<string, number>> {
      const totals = new Map<string, number>();
      if (waveProductIds.length === 0) return totals;

      const sums = await db
        .select({
          wave_product_id: orderItems.wave_product_id,
          total_ordered: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        })
        .from(orderItems)
        .where(inArray(orderItems.wave_product_id, waveProductIds))
        .groupBy(orderItems.wave_product_id);

      for (const row of sums) {
        totals.set(row.wave_product_id, Number(row.total_ordered) || 0);
      }
      return totals;
    },

    async enrichWavesWithProducts(waves: WaveRecord[]) {
      if (waves.length === 0) {
        return [];
      }

      const waveIds = waves.map((w) => w.id);
      const wpRows = await db
        .select({
          id: waveProducts.id,
          wave_id: waveProducts.wave_id,
          product_id: waveProducts.product_id,
          locked_price: waveProducts.locked_price,
          quota: waveProducts.quota,
          product: {
            id: products.id,
            store_id: products.store_id,
            name: products.name,
            description: products.description,
            base_price: products.base_price,
            image_url: products.image_url,
            is_archived: products.is_archived,
          },
        })
        .from(waveProducts)
        .innerJoin(products, eq(waveProducts.product_id, products.id))
        .where(inArray(waveProducts.wave_id, waveIds));

      const wpIds = wpRows.map((wp) => wp.id);
      const orderedTotals = await this.getOrderedTotalsByWaveProductIds(wpIds);

      const productsByWave = new Map<
        string,
        Array<
          (typeof wpRows)[number] & {
            ordered_quantity: number;
            remaining_quota: number | null;
          }
        >
      >();

      for (const wp of wpRows) {
        const orderedQuantity = orderedTotals.get(wp.id) ?? 0;
        const remainingQuota =
          wp.quota !== null ? Math.max(0, wp.quota - orderedQuantity) : null;

        const list = productsByWave.get(wp.wave_id) ?? [];
        list.push({
          ...wp,
          ordered_quantity: orderedQuantity,
          remaining_quota: remainingQuota,
        });
        productsByWave.set(wp.wave_id, list);
      }

      return waves.map((wave) => ({
        ...wave,
        products: productsByWave.get(wave.id) ?? [],
      }));
    },
  };
}

export type WaveRepo = ReturnType<typeof createWaveRepo>;
