import { CommerceErrors } from "../errors/commerce";
import type { AuthApiRepo } from "../repositories/auth-api";
import type { MediaStorageRepo } from "../repositories/media-storage";
import type { StoreRecord, StoreRepo } from "../repositories/stores";
import type { WaveRepo } from "../repositories/waves";
import type { AuthUser } from "../types/auth";
import type { UploadedImageInput } from "../types/commerce";
import { mapAuthApiUserToOpenPoUser, OPEN_PO_APP_ID } from "../utils/auth";
import { validateImageUpload } from "../utils/media";
import { slugifyStoreName } from "../utils/store";

export async function assertStoreOwnership(
  storeRepo: StoreRepo,
  storeIdOrSlug: string,
  user: AuthUser
): Promise<StoreRecord> {
  const store = await storeRepo.findByIdOrSlug(storeIdOrSlug);
  if (!store) {
    throw CommerceErrors.storeNotFound();
  }

  const isOwnerOrAdmin =
    store.owner_id === user.id || user.roles.includes("admin");
  if (!isOwnerOrAdmin) {
    throw CommerceErrors.storeForbidden();
  }

  return store;
}

export type StoreServiceDeps = {
  storeRepo: StoreRepo;
  waveRepo: WaveRepo;
  authApiRepo: AuthApiRepo;
  mediaStorageRepo: MediaStorageRepo;
};

export function createStoreService({
  storeRepo,
  waveRepo,
  authApiRepo,
  mediaStorageRepo,
}: StoreServiceDeps) {
  return {
    async listStores(filters: { slug?: string; owner_id?: string }) {
      return storeRepo.findAll({
        slug: filters.slug,
        ownerId: filters.owner_id,
      });
    },

    async getStore(idOrSlug: string) {
      const store = await storeRepo.findByIdOrSlug(idOrSlug);
      if (!store) {
        throw CommerceErrors.storeNotFound();
      }
      return store;
    },

    async createStore(input: {
      user: AuthUser;
      authToken: string;
      payload: {
        name: string;
        slug?: string;
        description: string;
        payment_instructions: string;
        whatsapp_contact: string;
      };
    }) {
      const slug =
        input.payload.slug ||
        `${slugifyStoreName(input.payload.name)}-${crypto.randomUUID().slice(0, 6)}`;

      const existingSlug = await storeRepo.findBySlug(slug);
      if (existingSlug) {
        throw CommerceErrors.storeSlugConflict(slug);
      }

      const newStore = await storeRepo.create({
        id: crypto.randomUUID(),
        owner_id: input.user.id,
        slug,
        name: input.payload.name,
        description: input.payload.description,
        logo_url: null,
        payment_instructions: input.payload.payment_instructions,
        whatsapp_contact: input.payload.whatsapp_contact,
        created_at: Math.floor(Date.now() / 1000),
      });

      let refreshedToken: string | undefined;
      let updatedUser: AuthUser | undefined;
      try {
        const grantRes = await authApiRepo.request("/api/v1/auth/roles/grant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.authToken}`,
          },
          body: JSON.stringify({
            app_id: OPEN_PO_APP_ID,
            role: "seller",
          }),
        });

        if (grantRes.ok && grantRes.data) {
          if (grantRes.data.token) {
            refreshedToken = grantRes.data.token;
          }
          if (grantRes.data.user) {
            updatedUser = mapAuthApiUserToOpenPoUser(
              grantRes.data.user,
              input.user.default_shipping_address
            );
          }
        }
      } catch {
        // Store creation succeeded; role grant can be retried if auth-api is temporarily unavailable
      }

      return {
        store: newStore,
        ...(refreshedToken ? { token: refreshedToken } : {}),
        ...(updatedUser ? { user: updatedUser } : {}),
      };
    },

    async updateStore(input: {
      user: AuthUser;
      storeIdOrSlug: string;
      updates: {
        name?: string;
        slug?: string;
        description?: string;
        payment_instructions?: string;
        whatsapp_contact?: string;
      };
    }) {
      const existingStore = await assertStoreOwnership(
        storeRepo,
        input.storeIdOrSlug,
        input.user
      );

      if (input.updates.slug && input.updates.slug !== existingStore.slug) {
        const duplicate = await storeRepo.findBySlug(input.updates.slug);
        if (duplicate) {
          throw CommerceErrors.storeSlugConflict(input.updates.slug);
        }
      }

      const updatedFields = {
        name: input.updates.name ?? existingStore.name,
        slug: input.updates.slug ?? existingStore.slug,
        description: input.updates.description ?? existingStore.description,
        payment_instructions:
          input.updates.payment_instructions ??
          existingStore.payment_instructions,
        whatsapp_contact:
          input.updates.whatsapp_contact ?? existingStore.whatsapp_contact,
      };

      await storeRepo.update(existingStore.id, updatedFields);

      return {
        ...existingStore,
        ...updatedFields,
      };
    },

    async uploadLogo(input: {
      user: AuthUser;
      storeIdOrSlug: string;
      image: UploadedImageInput;
    }) {
      const existingStore = await assertStoreOwnership(
        storeRepo,
        input.storeIdOrSlug,
        input.user
      );

      const { extension, mimeType } = validateImageUpload(input.image);
      const objectKey = `logos/${existingStore.id}/${crypto.randomUUID()}.${extension}`;

      await mediaStorageRepo.put(objectKey, input.image.fileBuffer, mimeType);

      if (existingStore.logo_url && existingStore.logo_url !== objectKey) {
        await mediaStorageRepo.delete(existingStore.logo_url);
      }

      await storeRepo.updateLogoUrl(existingStore.id, objectKey);

      return {
        store: {
          ...existingStore,
          logo_url: objectKey,
        },
        logo_url: objectKey,
      };
    },

    async getLogo(storeIdOrSlug: string): Promise<R2ObjectBody> {
      const store = await storeRepo.findByIdOrSlug(storeIdOrSlug);
      if (!store || !store.logo_url) {
        throw CommerceErrors.mediaNotFound("Store logo image not found");
      }

      const object = await mediaStorageRepo.get(store.logo_url);
      if (!object) {
        throw CommerceErrors.mediaNotFound("Logo object not found in storage");
      }

      return object;
    },

    async getActiveWaves(storeIdOrSlug: string) {
      const store = await storeRepo.findByIdOrSlug(storeIdOrSlug);
      if (!store) {
        throw CommerceErrors.storeNotFound();
      }

      const activeWaves = await waveRepo.findAll({
        storeId: store.id,
        status: "Active",
      });
      const enrichedWaves = await waveRepo.enrichWavesWithProducts(activeWaves);

      return { store, waves: enrichedWaves };
    },
  };
}

export type StoreService = ReturnType<typeof createStoreService>;
