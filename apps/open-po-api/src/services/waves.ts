import { CommerceErrors } from "../errors/commerce";
import type { OrderRepo } from "../repositories/orders";
import type { ProductRepo } from "../repositories/products";
import type { StoreRepo } from "../repositories/stores";
import type { WaveRepo } from "../repositories/waves";
import type { AuthUser } from "../types/auth";
import { assertStoreOwnership } from "./stores";

export type WaveServiceDeps = {
  waveRepo: WaveRepo;
  storeRepo: StoreRepo;
  productRepo: ProductRepo;
  orderRepo: OrderRepo;
};

export function createWaveService({
  waveRepo,
  storeRepo,
  productRepo,
  orderRepo,
}: WaveServiceDeps) {
  return {
    async listWaves(filters: { store_id?: string; status?: string }) {
      let resolvedStoreId: string | undefined;
      if (filters.store_id) {
        const store = await storeRepo.findByIdOrSlug(filters.store_id);
        resolvedStoreId = store ? store.id : filters.store_id;
      }

      const wavesList = await waveRepo.findAll({
        storeId: resolvedStoreId,
        status: filters.status,
      });

      return waveRepo.enrichWavesWithProducts(wavesList);
    },

    async listActiveWaves(store_id?: string) {
      return this.listWaves({ store_id, status: "Active" });
    },

    async getWave(id: string) {
      const wave = await waveRepo.findById(id);
      if (!wave) {
        throw CommerceErrors.waveNotFound();
      }

      const [store, enrichedList] = await Promise.all([
        storeRepo.findById(wave.store_id),
        waveRepo.enrichWavesWithProducts([wave]),
      ]);

      return {
        ...enrichedList[0]!,
        store: store ?? null,
      };
    },

    async createWave(input: {
      user: AuthUser;
      payload: {
        store_id: string;
        name: string;
        start_date: number;
        end_date: number;
        status?: string;
      };
    }) {
      const store = await assertStoreOwnership(
        storeRepo,
        input.payload.store_id,
        input.user
      );

      const newWave = await waveRepo.create({
        id: crypto.randomUUID(),
        store_id: store.id,
        name: input.payload.name,
        start_date: input.payload.start_date,
        end_date: input.payload.end_date,
        status: input.payload.status ?? "Draft",
      });

      return { ...newWave, products: [] };
    },

    async updateWave(input: {
      user: AuthUser;
      waveId: string;
      updates: {
        name?: string;
        start_date?: number;
        end_date?: number;
      };
    }) {
      const existingWave = await waveRepo.findById(input.waveId);
      if (!existingWave) {
        throw CommerceErrors.waveNotFound();
      }

      await assertStoreOwnership(storeRepo, existingWave.store_id, input.user);

      const nextStartDate =
        input.updates.start_date ?? existingWave.start_date;
      const nextEndDate = input.updates.end_date ?? existingWave.end_date;

      if (nextEndDate < nextStartDate) {
        throw CommerceErrors.waveInvalidDateRange();
      }

      const updatedFields = {
        name: input.updates.name ?? existingWave.name,
        start_date: nextStartDate,
        end_date: nextEndDate,
      };

      await waveRepo.update(input.waveId, updatedFields);

      return {
        ...existingWave,
        ...updatedFields,
      };
    },

    async updateStatus(input: {
      user: AuthUser;
      waveId: string;
      status: string;
    }) {
      const existingWave = await waveRepo.findById(input.waveId);
      if (!existingWave) {
        throw CommerceErrors.waveNotFound();
      }

      await assertStoreOwnership(storeRepo, existingWave.store_id, input.user);

      await waveRepo.updateStatus(input.waveId, input.status);

      return {
        ...existingWave,
        status: input.status,
      };
    },

    async upsertWaveProduct(input: {
      user: AuthUser;
      waveId: string;
      payload: {
        product_id: string;
        locked_price?: number;
        quota?: number | null;
      };
    }) {
      const wave = await waveRepo.findById(input.waveId);
      if (!wave) {
        throw CommerceErrors.waveNotFound();
      }

      await assertStoreOwnership(storeRepo, wave.store_id, input.user);

      const product = await productRepo.findById(input.payload.product_id);
      if (!product) {
        throw CommerceErrors.productNotFound();
      }

      if (product.store_id !== wave.store_id) {
        throw CommerceErrors.productStoreMismatch();
      }

      if (product.is_archived) {
        throw CommerceErrors.productArchived();
      }

      const resolvedLockedPrice =
        input.payload.locked_price !== undefined
          ? input.payload.locked_price
          : product.base_price;

      const existingWp = await waveRepo.findWaveProductByWaveAndProduct(
        input.waveId,
        input.payload.product_id
      );

      if (existingWp) {
        const updatedRecord = {
          locked_price: resolvedLockedPrice,
          quota:
            input.payload.quota !== undefined
              ? input.payload.quota
              : existingWp.quota,
        };

        await waveRepo.updateWaveProduct(existingWp.id, updatedRecord);

        return {
          created: false,
          wave_product: {
            ...existingWp,
            ...updatedRecord,
            product,
          },
        };
      }

      const newWp = await waveRepo.createWaveProduct({
        id: crypto.randomUUID(),
        wave_id: input.waveId,
        product_id: input.payload.product_id,
        locked_price: resolvedLockedPrice,
        quota: input.payload.quota ?? null,
      });

      return {
        created: true,
        wave_product: {
          ...newWp,
          product,
        },
      };
    },

    async removeWaveProduct(input: {
      user: AuthUser;
      waveId: string;
      waveProductId: string;
    }) {
      const wave = await waveRepo.findById(input.waveId);
      if (!wave) {
        throw CommerceErrors.waveNotFound();
      }

      await assertStoreOwnership(storeRepo, wave.store_id, input.user);

      const existingWp = await waveRepo.findWaveProductByIdAndWave(
        input.waveProductId,
        input.waveId
      );
      if (!existingWp) {
        throw CommerceErrors.waveProductNotFound();
      }

      const hasOrders = await orderRepo.hasOrderItemsForWaveProduct(
        input.waveProductId
      );
      if (hasOrders) {
        throw CommerceErrors.waveProductHasOrders();
      }

      await waveRepo.deleteWaveProduct(input.waveProductId);

      return { id: input.waveProductId };
    },
  };
}

export type WaveService = ReturnType<typeof createWaveService>;
