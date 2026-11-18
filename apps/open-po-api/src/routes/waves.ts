import { zValidator } from "@hono/zod-validator";
import {
  createWaveSchema,
  idParamSchema,
  updateWaveSchema,
  updateWaveStatusSchema,
  upsertWaveProductSchema,
  waveProductParamSchema,
  waveQuerySchema,
} from "@niwa/open-po-validators";
import { and, desc, eq, or, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import {
  createDb,
  orderItems,
  preOrderWaves,
  products,
  stores,
  waveProducts,
} from "../db";
import { authMiddleware } from "../middleware/auth";
import { checkStoreOwnership } from "../middleware/rbac";
import type { AppEnv } from "../types";
import { enrichWavesWithProducts } from "./stores";

export const wavesRoutes = new Hono<AppEnv>();

// GET /api/v1/waves - List waves (?store_id=, ?status=)
wavesRoutes.get("/", zValidator("query", waveQuerySchema), async (c) => {
  const { store_id, status } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const conditions: SQL[] = [];

  if (store_id) {
    const [resolvedStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(or(eq(stores.id, store_id), eq(stores.slug, store_id)))
      .limit(1);

    conditions.push(
      eq(
        preOrderWaves.store_id,
        resolvedStore ? resolvedStore.id : store_id
      )
    );
  }

  if (status) {
    conditions.push(eq(preOrderWaves.status, status));
  }

  const query = db
    .select()
    .from(preOrderWaves)
    .orderBy(desc(preOrderWaves.start_date));

  const wavesList =
    conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  const enriched = await enrichWavesWithProducts(db, wavesList);

  return c.json({ waves: enriched });
});

// GET /api/v1/waves/active - Publicly list active pre-order waves (?store_id=)
wavesRoutes.get("/active", zValidator("query", waveQuerySchema), async (c) => {
  const { store_id } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const conditions: SQL[] = [eq(preOrderWaves.status, "Active")];

  if (store_id) {
    const [resolvedStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(or(eq(stores.id, store_id), eq(stores.slug, store_id)))
      .limit(1);

    conditions.push(
      eq(
        preOrderWaves.store_id,
        resolvedStore ? resolvedStore.id : store_id
      )
    );
  }

  const activeWaves = await db
    .select()
    .from(preOrderWaves)
    .where(and(...conditions))
    .orderBy(desc(preOrderWaves.start_date));

  const enriched = await enrichWavesWithProducts(db, activeWaves);

  return c.json({ waves: enriched });
});

// GET /api/v1/waves/:id - Get single wave details with wave_products snapshot
wavesRoutes.get("/:id", zValidator("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const db = createDb(c.env.DB);

  const [wave] = await db
    .select()
    .from(preOrderWaves)
    .where(eq(preOrderWaves.id, id))
    .limit(1);

  if (!wave) {
    return c.json(
      { error: "NotFound", message: "Pre-order wave not found" },
      404
    );
  }

  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, wave.store_id))
    .limit(1);

  const [enrichedWave] = await enrichWavesWithProducts(db, [wave]);

  return c.json({
    wave: {
      ...enrichedWave,
      store: store ?? null,
    },
  });
});

// POST /api/v1/waves - Create a new Pre-Order Wave (Store Owner / Admin)
wavesRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", createWaveSchema),
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

    const newWave = {
      id: crypto.randomUUID(),
      store_id: ownership.store.id,
      name: payload.name,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: payload.status ?? "Draft",
    };

    await db.insert(preOrderWaves).values(newWave);

    return c.json({ wave: { ...newWave, products: [] } }, 201);
  }
);

// PUT /api/v1/waves/:id - Update Pre-Order Wave details (Store Owner / Admin)
wavesRoutes.put(
  "/:id",
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", updateWaveSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [existingWave] = await db
      .select()
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, id))
      .limit(1);

    if (!existingWave) {
      return c.json(
        { error: "NotFound", message: "Pre-order wave not found" },
        404
      );
    }

    const ownership = await checkStoreOwnership(
      db,
      existingWave.store_id,
      user
    );
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const nextStartDate = updates.start_date ?? existingWave.start_date;
    const nextEndDate = updates.end_date ?? existingWave.end_date;

    if (nextEndDate < nextStartDate) {
      return c.json(
        {
          error: "BadRequest",
          message: "end_date must be greater than or equal to start_date",
        },
        400
      );
    }

    const updatedFields = {
      name: updates.name ?? existingWave.name,
      start_date: nextStartDate,
      end_date: nextEndDate,
    };

    await db
      .update(preOrderWaves)
      .set(updatedFields)
      .where(eq(preOrderWaves.id, id));

    return c.json({
      wave: {
        ...existingWave,
        ...updatedFields,
      },
    });
  }
);

// PATCH /api/v1/waves/:id/status - Transition wave status (Draft -> Active -> Closed) (Store Owner / Admin)
wavesRoutes.patch(
  "/:id/status",
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", updateWaveStatusSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [existingWave] = await db
      .select()
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, id))
      .limit(1);

    if (!existingWave) {
      return c.json(
        { error: "NotFound", message: "Pre-order wave not found" },
        404
      );
    }

    const ownership = await checkStoreOwnership(
      db,
      existingWave.store_id,
      user
    );
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    await db
      .update(preOrderWaves)
      .set({ status })
      .where(eq(preOrderWaves.id, id));

    return c.json({
      wave: {
        ...existingWave,
        status,
      },
    });
  }
);

// POST /api/v1/waves/:id/products - Attach or update a product snapshot in a wave (Store Owner / Admin)
wavesRoutes.post(
  "/:id/products",
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", upsertWaveProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const { product_id, locked_price, quota } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [wave] = await db
      .select()
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, id))
      .limit(1);

    if (!wave) {
      return c.json(
        { error: "NotFound", message: "Pre-order wave not found" },
        404
      );
    }

    const ownership = await checkStoreOwnership(db, wave.store_id, user);
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, product_id))
      .limit(1);

    if (!product) {
      return c.json({ error: "NotFound", message: "Product not found" }, 404);
    }

    if (product.store_id !== wave.store_id) {
      return c.json(
        {
          error: "BadRequest",
          message: "Product does not belong to the same store as this wave",
        },
        400
      );
    }

    if (product.is_archived) {
      return c.json(
        {
          error: "BadRequest",
          message: "Archived products cannot be added to a pre-order wave",
        },
        400
      );
    }

    const resolvedLockedPrice =
      locked_price !== undefined ? locked_price : product.base_price;

    const [existingWaveProduct] = await db
      .select()
      .from(waveProducts)
      .where(
        and(
          eq(waveProducts.wave_id, id),
          eq(waveProducts.product_id, product_id)
        )
      )
      .limit(1);

    if (existingWaveProduct) {
      const updatedRecord = {
        locked_price: resolvedLockedPrice,
        quota: quota !== undefined ? quota : existingWaveProduct.quota,
      };

      await db
        .update(waveProducts)
        .set(updatedRecord)
        .where(eq(waveProducts.id, existingWaveProduct.id));

      return c.json({
        wave_product: {
          ...existingWaveProduct,
          ...updatedRecord,
          product,
        },
      });
    }

    const newWaveProduct = {
      id: crypto.randomUUID(),
      wave_id: id,
      product_id,
      locked_price: resolvedLockedPrice,
      quota: quota ?? null,
    };

    await db.insert(waveProducts).values(newWaveProduct);

    return c.json(
      {
        wave_product: {
          ...newWaveProduct,
          product,
        },
      },
      201
    );
  }
);

// DELETE /api/v1/waves/:id/products/:wave_product_id - Remove product from a wave (Store Owner / Admin)
wavesRoutes.delete(
  "/:id/products/:wave_product_id",
  authMiddleware,
  zValidator("param", waveProductParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id, wave_product_id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [wave] = await db
      .select()
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, id))
      .limit(1);

    if (!wave) {
      return c.json(
        { error: "NotFound", message: "Pre-order wave not found" },
        404
      );
    }

    const ownership = await checkStoreOwnership(db, wave.store_id, user);
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const [existingWp] = await db
      .select()
      .from(waveProducts)
      .where(
        and(
          eq(waveProducts.id, wave_product_id),
          eq(waveProducts.wave_id, id)
        )
      )
      .limit(1);

    if (!existingWp) {
      return c.json(
        { error: "NotFound", message: "Wave product not found in this wave" },
        404
      );
    }

    const [existingOrderItem] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.wave_product_id, wave_product_id))
      .limit(1);

    if (existingOrderItem) {
      return c.json(
        {
          error: "Conflict",
          message:
            "Cannot remove a wave product that already has customer orders placed against it",
        },
        409
      );
    }

    await db
      .delete(waveProducts)
      .where(eq(waveProducts.id, wave_product_id));

    return c.json({
      message: "Product removed from pre-order wave",
      id: wave_product_id,
    });
  }
);
