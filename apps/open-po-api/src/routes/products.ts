import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { createMediaStorageRepo } from "../repositories/media-storage";
import { createProductRepo } from "../repositories/products";
import { createReviewRepo } from "../repositories/reviews";
import { createStoreRepo } from "../repositories/stores";
import { createProductService } from "../services/products";
import type { AppEnv } from "../types/env";
import { toImageResponse } from "../utils/media";
import { validate } from "../validators";
import { extractUploadedImage } from "../validators/media";
import {
  archiveProductSchema,
  createProductSchema,
  idParamSchema,
  productQuerySchema,
  updateProductSchema,
} from "../validators/products";

function getProductService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createProductService({
    productRepo: createProductRepo(db),
    storeRepo: createStoreRepo(db),
    reviewRepo: createReviewRepo(db),
    mediaStorageRepo: createMediaStorageRepo(c.env.BUCKET),
  });
}

export const productsRoutes = new Hono<AppEnv>();

// GET /api/v1/products
productsRoutes.get("/", validate("query", productQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const products = await getProductService(c).listProducts(query);
  return c.json({ products });
});

// GET /api/v1/products/:id
productsRoutes.get("/:id", validate("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const product = await getProductService(c).getProduct(id);
  return c.json({ product });
});

// POST /api/v1/products
productsRoutes.post(
  "/",
  authMiddleware,
  validate("json", createProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const payload = c.req.valid("json");
    const product = await getProductService(c).createProduct({ user, payload });
    return c.json({ product }, 201);
  }
);

// PUT /api/v1/products/:id
productsRoutes.put(
  "/:id",
  authMiddleware,
  validate("param", idParamSchema),
  validate("json", updateProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const product = await getProductService(c).updateProduct({
      user,
      productId: id,
      updates,
    });
    return c.json({ product });
  }
);

// PATCH /api/v1/products/:id/archive
productsRoutes.patch(
  "/:id/archive",
  authMiddleware,
  validate("param", idParamSchema),
  validate("json", archiveProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const { is_archived } = c.req.valid("json");
    const product = await getProductService(c).setArchived({
      user,
      productId: id,
      isArchived: is_archived,
    });
    return c.json({ product });
  }
);

// PUT /api/v1/products/:id/image
productsRoutes.put(
  "/:id/image",
  authMiddleware,
  validate("param", idParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const image = await extractUploadedImage(c, ["image", "file"]);
    const result = await getProductService(c).uploadImage({
      user,
      productId: id,
      image,
    });
    return c.json(result);
  }
);

// GET /api/v1/products/:id/image
productsRoutes.get(
  "/:id/image",
  validate("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const object = await getProductService(c).getImage(id);
    return toImageResponse(object);
  }
);

// GET /api/v1/products/:id/reviews
productsRoutes.get(
  "/:id/reviews",
  validate("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await getProductService(c).listReviews(id);
    return c.json(result);
  }
);
