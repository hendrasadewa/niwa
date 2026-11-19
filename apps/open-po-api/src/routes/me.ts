import { zValidator } from "@hono/zod-validator";
import { updateProfileSchema } from "@niwa/open-po-validators";
import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  createDb,
  customerProfiles,
  orderItems,
  orders,
  preOrderWaves,
  products,
  stores,
  waveProducts,
} from "../db";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv, AuthUser } from "../types";
import {
  fetchAuthApi,
  mapAuthApiUserToOpenPoUser,
  type AuthApiResponsePayload,
} from "../utils/auth-client";

export const meRoutes = new Hono<AppEnv>();

meRoutes.use("*", authMiddleware);

// GET /api/v1/me - Retrieve current authenticated user profile and owned stores
meRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const db = createDb(c.env.DB);

  const ownedStores = await db
    .select()
    .from(stores)
    .where(eq(stores.owner_id, user.id));

  return c.json({
    user,
    stores: ownedStores,
  });
});

// PUT /api/v1/me - Update customer/seller profile (identity delegated to auth-api, address stored locally)
meRoutes.put("/", zValidator("json", updateProfileSchema), async (c) => {
  const user = c.get("user")!;
  const authToken = c.get("authToken")!;
  const updates = c.req.valid("json");
  const db = createDb(c.env.DB);

  let updatedUser: AuthUser = { ...user };
  let refreshedToken: string | undefined;

  if (updates.name !== undefined || updates.whatsapp_number !== undefined) {
    let authRes: Response;
    try {
      authRes = await fetchAuthApi(c.env, "/api/v1/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.whatsapp_number !== undefined
            ? { whatsapp_number: updates.whatsapp_number }
            : {}),
        }),
      });
    } catch {
      return c.json(
        {
          error: "BadGateway",
          message: "Unable to reach authentication service",
        },
        502
      );
    }

    const authData = (await authRes
      .json()
      .catch(() => null)) as AuthApiResponsePayload | null;

    if (!authRes.ok || !authData?.user) {
      return c.json(
        authData ?? {
          error: "AuthError",
          message: "Failed to update user identity in authentication service",
        },
        authRes.status as ContentfulStatusCode
      );
    }

    updatedUser = mapAuthApiUserToOpenPoUser(
      authData.user,
      user.default_shipping_address
    );
    refreshedToken = authData.token;
  }

  if (updates.default_shipping_address !== undefined) {
    const nextAddress = updates.default_shipping_address;
    const now = Math.floor(Date.now() / 1000);

    await db
      .insert(customerProfiles)
      .values({
        user_id: user.id,
        default_shipping_address: nextAddress,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: customerProfiles.user_id,
        set: {
          default_shipping_address: nextAddress,
          updated_at: now,
        },
      });

    updatedUser = {
      ...updatedUser,
      default_shipping_address: nextAddress,
    };
  }

  return c.json({
    user: updatedUser,
    ...(refreshedToken ? { token: refreshedToken } : {}),
  });
});

// GET /api/v1/me/stores - List stores owned by the authenticated seller
meRoutes.get("/stores", async (c) => {
  const user = c.get("user")!;
  const db = createDb(c.env.DB);

  const ownedStores = await db
    .select()
    .from(stores)
    .where(eq(stores.owner_id, user.id))
    .orderBy(desc(stores.created_at));

  return c.json({ stores: ownedStores });
});

// GET /api/v1/me/orders - List authenticated customer's order history
meRoutes.get("/orders", async (c) => {
  const user = c.get("user")!;
  const db = createDb(c.env.DB);

  const userOrders = await db
    .select({
      id: orders.id,
      slug: orders.slug,
      wave_id: orders.wave_id,
      customer_id: orders.customer_id,
      customer_name: orders.customer_name,
      customer_whatsapp: orders.customer_whatsapp,
      shipping_address: orders.shipping_address,
      total_amount: orders.total_amount,
      payment_receipt_url: orders.payment_receipt_url,
      status: orders.status,
      tracking_number: orders.tracking_number,
      created_at: orders.created_at,
      wave: {
        id: preOrderWaves.id,
        name: preOrderWaves.name,
        status: preOrderWaves.status,
        store_id: preOrderWaves.store_id,
      },
      store: {
        id: stores.id,
        slug: stores.slug,
        name: stores.name,
        whatsapp_contact: stores.whatsapp_contact,
      },
    })
    .from(orders)
    .innerJoin(preOrderWaves, eq(orders.wave_id, preOrderWaves.id))
    .innerJoin(stores, eq(preOrderWaves.store_id, stores.id))
    .where(eq(orders.customer_id, user.id))
    .orderBy(desc(orders.created_at));

  if (userOrders.length === 0) {
    return c.json({ orders: [] });
  }

  const orderIds = userOrders.map((o) => o.id);
  const items = await db
    .select({
      id: orderItems.id,
      order_id: orderItems.order_id,
      wave_product_id: orderItems.wave_product_id,
      quantity: orderItems.quantity,
      subtotal: orderItems.subtotal,
      locked_price: waveProducts.locked_price,
      product_id: products.id,
      product_name: products.name,
      product_image_url: products.image_url,
    })
    .from(orderItems)
    .innerJoin(waveProducts, eq(orderItems.wave_product_id, waveProducts.id))
    .innerJoin(products, eq(waveProducts.product_id, products.id))
    .where(inArray(orderItems.order_id, orderIds));

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push(item);
    itemsByOrder.set(item.order_id, existing);
  }

  const enrichedOrders = userOrders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));

  return c.json({ orders: enrichedOrders });
});
