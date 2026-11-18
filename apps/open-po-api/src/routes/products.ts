import { zValidator } from "@hono/zod-validator";
import {
  archiveProductSchema,
  createProductSchema,
  idParamSchema,
  productQuerySchema,
  updateProductSchema,
} from "@niwa/open-po-validators";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { createDb, products, reviews, stores, users } from "../db";
import { authMiddleware } from "../middleware/auth";
import { checkStoreOwnership } from "../middleware/rbac";
import type { AppEnv } from "../types";
import { streamImageFromR2, uploadImageToR2 } from "../utils/r2";

export const productsRoutes = new Hono<AppEnv>();

// GET /api/v1/products - List products (?store_id=, ?search=, ?include_archived=)
productsRoutes.get(
  "/",
  zValidator("query", productQuerySchema),
  async (c) => {
    const { store_id, search, include_archived } = c.req.valid("query");
    const db = createDb(c.env.DB);

    const conditions: SQL[] = [];

    if (store_id) {
      // Allow store_id or store slug
      const [resolvedStore] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(or(eq(stores.id, store_id), eq(stores.slug, store_id)))
        .limit(1);

      conditions.push(
        eq(products.store_id, resolvedStore ? resolvedStore.id : store_id)
      );
    }

    if (!include_archived) {
      conditions.push(eq(products.is_archived, false));
    }

    if (search) {
      const pattern = `%${search}%`;
      const searchCond = or(
        like(products.name, pattern),
        like(products.description, pattern)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const query = db.select().from(products);
    const results =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return c.json({ products: results });
  }
);

// GET /api/v1/products/:id - Get single product details with review summary
productsRoutes.get("/:id", zValidator("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const db = createDb(c.env.DB);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    return c.json({ error: "NotFound", message: "Product not found" }, 404);
  }

  const [reviewStats] = await db
    .select({
      average_rating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
      total_reviews: sql<number>`count(${reviews.id})`,
    })
    .from(reviews)
    .where(eq(reviews.product_id, id));

  return c.json({
    product: {
      ...product,
      review_summary: {
        average_rating: Number(
          Number(reviewStats?.average_rating ?? 0).toFixed(2)
        ),
        total_reviews: Number(reviewStats?.total_reviews ?? 0),
      },
    },
  });
});

// POST /api/v1/products - Create master catalog product (Store Owner / Admin)
productsRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", createProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const payload = c.req.valid("json");
    const db = createDb(c.env.DB);

    const ownership = await checkStoreOwnership(db, payload.store_id, user);
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const newProduct = {
      id: crypto.randomUUID(),
      store_id: ownership.store.id,
      name: payload.name,
      description: payload.description,
      base_price: payload.base_price,
      image_url: payload.image_url ?? null,
      is_archived: false,
    };

    await db.insert(products).values(newProduct);

    return c.json({ product: newProduct }, 201);
  }
);

// PUT /api/v1/products/:id - Update master catalog product metadata / base_price (Store Owner / Admin)
productsRoutes.put(
  "/:id",
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", updateProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingProduct) {
      return c.json({ error: "NotFound", message: "Product not found" }, 404);
    }

    const ownership = await checkStoreOwnership(
      db,
      existingProduct.store_id,
      user
    );
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const updatedFields = {
      name: updates.name ?? existingProduct.name,
      description: updates.description ?? existingProduct.description,
      base_price: updates.base_price ?? existingProduct.base_price,
    };

    await db.update(products).set(updatedFields).where(eq(products.id, id));

    return c.json({
      product: {
        ...existingProduct,
        ...updatedFields,
      },
    });
  }
);

// PATCH /api/v1/products/:id/archive - Soft-archive or unarchive product (Store Owner / Admin)
productsRoutes.patch(
  "/:id/archive",
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", archiveProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const { is_archived } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingProduct) {
      return c.json({ error: "NotFound", message: "Product not found" }, 404);
    }

    const ownership = await checkStoreOwnership(
      db,
      existingProduct.store_id,
      user
    );
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    await db.update(products).set({ is_archived }).where(eq(products.id, id));

    return c.json({
      product: {
        ...existingProduct,
        is_archived,
      },
    });
  }
);

// PUT /api/v1/products/:id/image - Upload product image to R2 (Store Owner / Admin)
productsRoutes.put(
  "/:id/image",
  authMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingProduct) {
      return c.json({ error: "NotFound", message: "Product not found" }, 404);
    }

    const ownership = await checkStoreOwnership(
      db,
      existingProduct.store_id,
      user
    );
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const uploadResult = await uploadImageToR2(c, {
      prefix: "products",
      entityId: existingProduct.id,
      previousKey: existingProduct.image_url,
      fieldNames: ["image", "file"],
    });

    if (!uploadResult.ok) {
      return c.json(
        { error: uploadResult.error, message: uploadResult.message },
        uploadResult.status
      );
    }

    await db
      .update(products)
      .set({ image_url: uploadResult.objectKey })
      .where(eq(products.id, id));

    return c.json({
      product: {
        ...existingProduct,
        image_url: uploadResult.objectKey,
      },
      image_url: uploadResult.objectKey,
    });
  }
);

// GET /api/v1/products/:id/image - Stream product image from R2
productsRoutes.get(
  "/:id/image",
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [product] = await db
      .select({ id: products.id, image_url: products.image_url })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product || !product.image_url) {
      return c.json(
        { error: "NotFound", message: "Product image not found" },
        404
      );
    }

    const response = await streamImageFromR2(c.env.BUCKET, product.image_url);
    if (!response) {
      return c.json(
        { error: "NotFound", message: "Product image object not found in storage" },
        404
      );
    }

    return response;
  }
);

// GET /api/v1/products/:id/reviews - List reviews for a product with summary stats
productsRoutes.get(
  "/:id/reviews",
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [product] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return c.json({ error: "NotFound", message: "Product not found" }, 404);
    }

    const productReviews = await db
      .select({
        id: reviews.id,
        product_id: reviews.product_id,
        order_id: reviews.order_id,
        customer_id: reviews.customer_id,
        customer_name: users.name,
        rating: reviews.rating,
        comment: reviews.comment,
        created_at: reviews.created_at,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.customer_id, users.id))
      .where(eq(reviews.product_id, id))
      .orderBy(desc(reviews.created_at));

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

    return c.json({
      product_id: id,
      summary: {
        average_rating: averageRating,
        total_reviews: totalReviews,
      },
      reviews: productReviews,
    });
  }
);
