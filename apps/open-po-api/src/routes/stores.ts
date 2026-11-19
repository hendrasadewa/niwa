import { zValidator } from "@hono/zod-validator";
import {
  createStoreSchema,
  idParamSchema,
  storeQuerySchema,
  updateStoreSchema,
} from "@niwa/open-po-validators";
import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import {
  createDb,
  orderItems,
  preOrderWaves,
  products,
  stores,
  waveProducts,
  type Database,
} from "../db";
import { authMiddleware } from "../middleware/auth";
import { checkStoreOwnership } from "../middleware/rbac";
import type { AppEnv, AuthUser } from "../types";
import {
  OPEN_PO_APP_ID,
  fetchAuthApi,
  mapAuthApiUserToOpenPoUser,
  type AuthApiResponsePayload,
} from "../utils/auth-client";
import { streamImageFromR2, uploadImageToR2 } from "../utils/r2";

function slugifyStoreName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Shared helper to enrich a list of waves with their `wave_products`, product metadata,
 * ordered quantities, and remaining quotas.
 */
export async function enrichWavesWithProducts(
  db: Database,
  waves: Array<typeof preOrderWaves.$inferSelect>
) {
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
  const orderedTotals = new Map<string, number>();

  if (wpIds.length > 0) {
    const sums = await db
      .select({
        wave_product_id: orderItems.wave_product_id,
        total_ordered: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      })
      .from(orderItems)
      .where(inArray(orderItems.wave_product_id, wpIds))
      .groupBy(orderItems.wave_product_id);

    for (const row of sums) {
      orderedTotals.set(row.wave_product_id, Number(row.total_ordered) || 0);
    }
  }

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
}

export const storesRoutes = new Hono<AppEnv>();

// GET /api/v1/stores - List stores (supports ?slug= and ?owner_id=)
storesRoutes.get("/", zValidator("query", storeQuerySchema), async (c) => {
  const { slug, owner_id } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const conditions: SQL[] = [];
  if (slug) {
    conditions.push(eq(stores.slug, slug.toLowerCase()));
  }
  if (owner_id) {
    conditions.push(eq(stores.owner_id, owner_id));
  }

  const query = db.select().from(stores).orderBy(desc(stores.created_at));
  const results =
    conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  return c.json({ stores: results });
});

// POST /api/v1/stores - Seller creates their own store
storesRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", createStoreSchema),
  async (c) => {
    const user = c.get("user")!;
    const authToken = c.get("authToken")!;
    const payload = c.req.valid("json");
    const db = createDb(c.env.DB);

    const slug =
      payload.slug ||
      `${slugifyStoreName(payload.name)}-${crypto.randomUUID().slice(0, 6)}`;

    const [existingSlug] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);

    if (existingSlug) {
      return c.json(
        {
          error: "Conflict",
          message: `A store with slug '${slug}' already exists`,
        },
        409
      );
    }

    const newStore = {
      id: crypto.randomUUID(),
      owner_id: user.id,
      slug,
      name: payload.name,
      description: payload.description,
      logo_url: null,
      payment_instructions: payload.payment_instructions,
      whatsapp_contact: payload.whatsapp_contact,
      created_at: Math.floor(Date.now() / 1000),
    };

    await db.insert(stores).values(newStore);

    // Delegate granting the 'seller' role for 'open-po' to @niwa/auth-api
    let refreshedToken: string | undefined;
    let updatedUser: AuthUser | undefined;
    try {
      const grantRes = await fetchAuthApi(c.env, "/api/v1/auth/roles/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          app_id: OPEN_PO_APP_ID,
          role: "seller",
        }),
      });

      if (grantRes.ok) {
        const grantData = (await grantRes
          .json()
          .catch(() => null)) as AuthApiResponsePayload | null;
        if (grantData?.token) {
          refreshedToken = grantData.token;
        }
        if (grantData?.user) {
          updatedUser = mapAuthApiUserToOpenPoUser(
            grantData.user,
            user.default_shipping_address
          );
        }
      }
    } catch {
      // Store creation succeeded; role grant can be retried on next login/refresh if auth-api is unavailable
    }

    return c.json(
      {
        store: newStore,
        ...(refreshedToken ? { token: refreshedToken } : {}),
        ...(updatedUser ? { user: updatedUser } : {}),
      },
      201
    );
  }
);

// GET /api/v1/stores/:id - Retrieve store details by ID or slug
storesRoutes.get("/:id", zValidator("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const db = createDb(c.env.DB);

  const [store] = await db
    .select()
    .from(stores)
    .where(or(eq(stores.id, id), eq(stores.slug, id)))
    .limit(1);

  if (!store) {
    return c.json({ error: "NotFound", message: "Store not found" }, 404);
  }

  return c.json({ store });
});

// PUT /api/v1/stores/:id - Update store settings (Store Owner / Admin)
storesRoutes.put(
  "/:id",
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", updateStoreSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const db = createDb(c.env.DB);

    const ownership = await checkStoreOwnership(db, id, user);
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const existingStore = ownership.store;

    if (updates.slug && updates.slug !== existingStore.slug) {
      const [duplicateSlug] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.slug, updates.slug))
        .limit(1);

      if (duplicateSlug) {
        return c.json(
          {
            error: "Conflict",
            message: `A store with slug '${updates.slug}' already exists`,
          },
          409
        );
      }
    }

    const updatedFields = {
      name: updates.name ?? existingStore.name,
      slug: updates.slug ?? existingStore.slug,
      description: updates.description ?? existingStore.description,
      payment_instructions:
        updates.payment_instructions ?? existingStore.payment_instructions,
      whatsapp_contact:
        updates.whatsapp_contact ?? existingStore.whatsapp_contact,
    };

    await db
      .update(stores)
      .set(updatedFields)
      .where(eq(stores.id, existingStore.id));

    return c.json({
      store: {
        ...existingStore,
        ...updatedFields,
      },
    });
  }
);

// PUT /api/v1/stores/:id/logo - Upload store logo to R2 (Store Owner / Admin)
storesRoutes.put(
  "/:id/logo",
  authMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const ownership = await checkStoreOwnership(db, id, user);
    if (!ownership.ok) {
      return c.json(
        { error: ownership.error, message: ownership.message },
        ownership.status
      );
    }

    const existingStore = ownership.store;
    const uploadResult = await uploadImageToR2(c, {
      prefix: "logos",
      entityId: existingStore.id,
      previousKey: existingStore.logo_url,
      fieldNames: ["logo", "file", "image"],
    });

    if (!uploadResult.ok) {
      return c.json(
        { error: uploadResult.error, message: uploadResult.message },
        uploadResult.status
      );
    }

    await db
      .update(stores)
      .set({ logo_url: uploadResult.objectKey })
      .where(eq(stores.id, existingStore.id));

    return c.json({
      store: {
        ...existingStore,
        logo_url: uploadResult.objectKey,
      },
      logo_url: uploadResult.objectKey,
    });
  }
);

// GET /api/v1/stores/:id/logo - Stream store logo from R2
storesRoutes.get("/:id/logo", zValidator("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const db = createDb(c.env.DB);

  const [store] = await db
    .select({ id: stores.id, logo_url: stores.logo_url })
    .from(stores)
    .where(or(eq(stores.id, id), eq(stores.slug, id)))
    .limit(1);

  if (!store || !store.logo_url) {
    return c.json(
      { error: "NotFound", message: "Store logo image not found" },
      404
    );
  }

  const response = await streamImageFromR2(c.env.BUCKET, store.logo_url);
  if (!response) {
    return c.json(
      { error: "NotFound", message: "Logo object not found in storage" },
      404
    );
  }

  return response;
});

// GET /api/v1/stores/:id/waves/active - Public storefront active pre-order waves for a store
storesRoutes.get(
  "/:id/waves/active",
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [store] = await db
      .select()
      .from(stores)
      .where(or(eq(stores.id, id), eq(stores.slug, id)))
      .limit(1);

    if (!store) {
      return c.json({ error: "NotFound", message: "Store not found" }, 404);
    }

    const activeWaves = await db
      .select()
      .from(preOrderWaves)
      .where(
        and(
          eq(preOrderWaves.store_id, store.id),
          eq(preOrderWaves.status, "Active")
        )
      )
      .orderBy(desc(preOrderWaves.start_date));

    const enrichedWaves = await enrichWavesWithProducts(db, activeWaves);

    return c.json({
      store,
      waves: enrichedWaves,
    });
  }
);
