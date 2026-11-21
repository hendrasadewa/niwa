import { CommerceErrors } from "../errors/commerce";
import type { MediaStorageRepo } from "../repositories/media-storage";
import type { ProductRepo } from "../repositories/products";
import type { ReviewRepo } from "../repositories/reviews";
import type { StoreRepo } from "../repositories/stores";
import type { AuthUser } from "../types/auth";
import type { UploadedImageInput } from "../types/commerce";
import { validateImageUpload } from "../utils/media";
import { assertStoreOwnership } from "./stores";

export type ProductServiceDeps = {
  productRepo: ProductRepo;
  storeRepo: StoreRepo;
  reviewRepo: ReviewRepo;
  mediaStorageRepo: MediaStorageRepo;
};

export function createProductService({
  productRepo,
  storeRepo,
  reviewRepo,
  mediaStorageRepo,
}: ProductServiceDeps) {
  return {
    async listProducts(filters: {
      store_id?: string;
      search?: string;
      include_archived?: boolean;
    }) {
      let resolvedStoreId: string | undefined;
      if (filters.store_id) {
        const store = await storeRepo.findByIdOrSlug(filters.store_id);
        resolvedStoreId = store ? store.id : filters.store_id;
      }

      return productRepo.findAll({
        storeId: resolvedStoreId,
        search: filters.search,
        includeArchived: filters.include_archived,
      });
    },

    async getProduct(id: string) {
      const product = await productRepo.findById(id);
      if (!product) {
        throw CommerceErrors.productNotFound();
      }

      const reviewSummary = await reviewRepo.getSummaryByProductId(id);
      return {
        ...product,
        review_summary: reviewSummary,
      };
    },

    async createProduct(input: {
      user: AuthUser;
      payload: {
        store_id: string;
        name: string;
        description: string;
        base_price: number;
        image_url?: string | null;
      };
    }) {
      const store = await assertStoreOwnership(
        storeRepo,
        input.payload.store_id,
        input.user
      );

      return productRepo.create({
        id: crypto.randomUUID(),
        store_id: store.id,
        name: input.payload.name,
        description: input.payload.description,
        base_price: input.payload.base_price,
        image_url: input.payload.image_url ?? null,
        is_archived: false,
      });
    },

    async updateProduct(input: {
      user: AuthUser;
      productId: string;
      updates: {
        name?: string;
        description?: string;
        base_price?: number;
      };
    }) {
      const existingProduct = await productRepo.findById(input.productId);
      if (!existingProduct) {
        throw CommerceErrors.productNotFound();
      }

      await assertStoreOwnership(
        storeRepo,
        existingProduct.store_id,
        input.user
      );

      const updatedFields = {
        name: input.updates.name ?? existingProduct.name,
        description: input.updates.description ?? existingProduct.description,
        base_price: input.updates.base_price ?? existingProduct.base_price,
      };

      await productRepo.update(input.productId, updatedFields);

      return {
        ...existingProduct,
        ...updatedFields,
      };
    },

    async setArchived(input: {
      user: AuthUser;
      productId: string;
      isArchived: boolean;
    }) {
      const existingProduct = await productRepo.findById(input.productId);
      if (!existingProduct) {
        throw CommerceErrors.productNotFound();
      }

      await assertStoreOwnership(
        storeRepo,
        existingProduct.store_id,
        input.user
      );

      await productRepo.updateArchived(input.productId, input.isArchived);

      return {
        ...existingProduct,
        is_archived: input.isArchived,
      };
    },

    async uploadImage(input: {
      user: AuthUser;
      productId: string;
      image: UploadedImageInput;
    }) {
      const existingProduct = await productRepo.findById(input.productId);
      if (!existingProduct) {
        throw CommerceErrors.productNotFound();
      }

      await assertStoreOwnership(
        storeRepo,
        existingProduct.store_id,
        input.user
      );

      const { extension, mimeType } = validateImageUpload(input.image);
      const objectKey = `products/${existingProduct.id}/${crypto.randomUUID()}.${extension}`;

      await mediaStorageRepo.put(objectKey, input.image.fileBuffer, mimeType);

      if (
        existingProduct.image_url &&
        existingProduct.image_url !== objectKey
      ) {
        await mediaStorageRepo.delete(existingProduct.image_url);
      }

      await productRepo.updateImageUrl(existingProduct.id, objectKey);

      return {
        product: {
          ...existingProduct,
          image_url: objectKey,
        },
        image_url: objectKey,
      };
    },

    async getImage(productId: string): Promise<R2ObjectBody> {
      const product = await productRepo.findById(productId);
      if (!product || !product.image_url) {
        throw CommerceErrors.mediaNotFound("Product image not found");
      }

      const object = await mediaStorageRepo.get(product.image_url);
      if (!object) {
        throw CommerceErrors.mediaNotFound(
          "Product image object not found in storage"
        );
      }

      return object;
    },

    async listReviews(productId: string) {
      const product = await productRepo.findById(productId);
      if (!product) {
        throw CommerceErrors.productNotFound();
      }

      const productReviews = await reviewRepo.findByProductId(productId);
      const totalReviews = productReviews.length;
      const averageRating =
        totalReviews > 0
          ? Number(
              (
                productReviews.reduce((acc, r) => acc + r.rating, 0) /
                totalReviews
              ).toFixed(2)
            )
          : 0;

      return {
        product_id: productId,
        summary: {
          average_rating: averageRating,
          total_reviews: totalReviews,
        },
        reviews: productReviews,
      };
    },
  };
}

export type ProductService = ReturnType<typeof createProductService>;
