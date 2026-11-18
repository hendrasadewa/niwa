import { zValidator } from "@hono/zod-validator";
import {
  ORDER_STATUSES,
  checkoutOrderSchema,
  idParamSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
  type OrderStatus,
} from "@niwa/open-po-validators";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import {
  createDb,
  orderItems,
  orders,
  preOrderWaves,
  products,
  stores,
  users,
  waveProducts,
} from "../db";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth";
import { checkStoreOwnership } from "../middleware/rbac";
import type { AppEnv } from "../types";
import { streamImageFromR2, uploadImageToR2 } from "../utils/r2";

function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("08")) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

export const ordersRoutes = new Hono<AppEnv>();

// POST /api/v1/orders/checkout - Submit an order for an active wave (Member or Guest)
ordersRoutes.post(
  "/checkout",
  optionalAuthMiddleware,
  zValidator("json", checkoutOrderSchema),
  async (c) => {
    const user = c.get("user");
    const payload = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [wave] = await db
      .select()
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, payload.wave_id))
      .limit(1);

    if (!wave) {
      return c.json(
        { error: "NotFound", message: "Pre-order wave not found" },
        404
      );
    }

    if (wave.status !== "Active") {
      return c.json(
        {
          error: "BadRequest",
          message: `Pre-order wave is currently '${wave.status}' and not accepting orders`,
        },
        400
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > wave.end_date) {
      return c.json(
        {
          error: "BadRequest",
          message: "Pre-order wave period has ended",
        },
        400
      );
    }

    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, wave.store_id))
      .limit(1);

    if (!store) {
      return c.json({ error: "NotFound", message: "Store not found" }, 404);
    }

    const shippingAddress =
      payload.shipping_address ?? user?.default_shipping_address ?? null;

    if (!shippingAddress) {
      return c.json(
        {
          error: "BadRequest",
          message: "Shipping address is required for checkout",
        },
        400
      );
    }

    if (!user && (!payload.guest_name || !payload.guest_whatsapp)) {
      return c.json(
        {
          error: "BadRequest",
          message:
            "Guest checkout requires both 'guest_name' and 'guest_whatsapp'",
        },
        400
      );
    }

    // Aggregate quantities in case duplicate wave_product_id entries were sent
    const quantityByWaveProduct = new Map<string, number>();
    for (const item of payload.items) {
      const prev = quantityByWaveProduct.get(item.wave_product_id) ?? 0;
      quantityByWaveProduct.set(item.wave_product_id, prev + item.quantity);
    }

    const requestedWpIds = Array.from(quantityByWaveProduct.keys());

    const wpRecords = await db
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
        and(
          eq(waveProducts.wave_id, wave.id),
          inArray(waveProducts.id, requestedWpIds)
        )
      );

    if (wpRecords.length !== requestedWpIds.length) {
      return c.json(
        {
          error: "BadRequest",
          message:
            "One or more requested items do not belong to the target pre-order wave",
        },
        400
      );
    }

    // Check existing ordered quantities for quota enforcement
    const existingSums = await db
      .select({
        wave_product_id: orderItems.wave_product_id,
        total_ordered: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      })
      .from(orderItems)
      .where(inArray(orderItems.wave_product_id, requestedWpIds))
      .groupBy(orderItems.wave_product_id);

    const orderedMap = new Map<string, number>();
    for (const row of existingSums) {
      orderedMap.set(row.wave_product_id, Number(row.total_ordered) || 0);
    }

    for (const wp of wpRecords) {
      const requestedQty = quantityByWaveProduct.get(wp.id) ?? 0;
      if (wp.quota !== null) {
        const alreadyOrdered = orderedMap.get(wp.id) ?? 0;
        const remaining = Math.max(0, wp.quota - alreadyOrdered);
        if (requestedQty > remaining) {
          return c.json(
            {
              error: "Conflict",
              message: `Insufficient quota for '${wp.product_name}'. Requested: ${requestedQty}, Remaining: ${remaining}`,
            },
            409
          );
        }
      }
    }

    const orderId = crypto.randomUUID();
    let totalAmount = 0;

    const orderItemsToInsert: Array<typeof orderItems.$inferInsert> = [];
    const enrichedItems: Array<{
      id: string;
      order_id: string;
      wave_product_id: string;
      product_id: string;
      product_name: string;
      locked_price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const wp of wpRecords) {
      const quantity = quantityByWaveProduct.get(wp.id) ?? 0;
      const subtotal = wp.locked_price * quantity;
      totalAmount += subtotal;

      const itemId = crypto.randomUUID();
      orderItemsToInsert.push({
        id: itemId,
        order_id: orderId,
        wave_product_id: wp.id,
        quantity,
        subtotal,
      });

      enrichedItems.push({
        id: itemId,
        order_id: orderId,
        wave_product_id: wp.id,
        product_id: wp.product_id,
        product_name: wp.product_name,
        locked_price: wp.locked_price,
        quantity,
        subtotal,
      });
    }

    const newOrder: typeof orders.$inferInsert = {
      id: orderId,
      wave_id: wave.id,
      customer_id: user ? user.id : null,
      guest_name: user ? null : (payload.guest_name ?? null),
      guest_whatsapp: user ? null : (payload.guest_whatsapp ?? null),
      shipping_address: shippingAddress,
      total_amount: totalAmount,
      payment_receipt_url: null,
      status: "Received",
      tracking_number: null,
      created_at: now,
    };

    await db.insert(orders).values(newOrder);
    await db.insert(orderItems).values(orderItemsToInsert);

    const customerName = user ? user.name : (payload.guest_name ?? "Customer");
    const itemsText = enrichedItems
      .map((item) => `- ${item.product_name} x${item.quantity} (${item.subtotal})`)
      .join("\n");
    const waMessage = `Halo ${store.name}, saya ${customerName} ingin konfirmasi pembayaran Pre-Order (${wave.name}).\n\nOrder ID: ${orderId}\n${itemsText}\nTotal: ${totalAmount}`;
    const waPhone = formatWhatsAppPhone(store.whatsapp_contact);
    const whatsappRedirectUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

    return c.json(
      {
        order: {
          ...newOrder,
          items: enrichedItems,
        },
        payment_instructions: store.payment_instructions,
        whatsapp_redirect_url: whatsappRedirectUrl,
        tracking_url: `/api/v1/track/${orderId}`,
      },
      201
    );
  }
);

// GET /api/v1/orders - Seller Kanban & List Order Dashboard (Store Owner / Admin)
ordersRoutes.get(
  "/",
  authMiddleware,
  zValidator("query", orderQuerySchema),
  async (c) => {
    const user = c.get("user")!;
    const { store_id, wave_id, status, view } = c.req.valid("query");
    const db = createDb(c.env.DB);

    const conditions: SQL[] = [];

    if (store_id) {
      const ownership = await checkStoreOwnership(db, store_id, user);
      if (!ownership.ok) {
        return c.json(
          { error: ownership.error, message: ownership.message },
          ownership.status
        );
      }
      conditions.push(eq(preOrderWaves.store_id, ownership.store.id));
    } else if (wave_id) {
      const [wave] = await db
        .select()
        .from(preOrderWaves)
        .where(eq(preOrderWaves.id, wave_id))
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
      conditions.push(eq(orders.wave_id, wave.id));
    } else if (!user.roles.includes("admin")) {
      // Filter to stores owned by the authenticated seller
      const ownedStores = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.owner_id, user.id));

      if (ownedStores.length === 0) {
        return c.json({
          orders: [],
          ...(view === "kanban"
            ? {
                kanban: Object.fromEntries(
                  ORDER_STATUSES.map((s) => [s, []])
                ),
              }
            : {}),
        });
      }

      conditions.push(
        inArray(
          preOrderWaves.store_id,
          ownedStores.map((s) => s.id)
        )
      );
    }

    if (wave_id) {
      conditions.push(eq(orders.wave_id, wave_id));
    }

    if (status) {
      conditions.push(eq(orders.status, status));
    }

    const baseQuery = db
      .select({
        id: orders.id,
        wave_id: orders.wave_id,
        customer_id: orders.customer_id,
        customer_name: users.name,
        customer_email: users.email,
        customer_whatsapp: users.whatsapp_number,
        guest_name: orders.guest_name,
        guest_whatsapp: orders.guest_whatsapp,
        shipping_address: orders.shipping_address,
        total_amount: orders.total_amount,
        payment_receipt_url: orders.payment_receipt_url,
        status: orders.status,
        tracking_number: orders.tracking_number,
        created_at: orders.created_at,
        wave: {
          id: preOrderWaves.id,
          name: preOrderWaves.name,
          store_id: preOrderWaves.store_id,
        },
      })
      .from(orders)
      .innerJoin(preOrderWaves, eq(orders.wave_id, preOrderWaves.id))
      .leftJoin(users, eq(orders.customer_id, users.id))
      .orderBy(desc(orders.created_at));

    const orderRows =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;

    const orderIds = orderRows.map((o) => o.id);
    const itemsByOrder = new Map<
      string,
      Array<{
        id: string;
        order_id: string;
        wave_product_id: string;
        quantity: number;
        subtotal: number;
        locked_price: number;
        product_id: string;
        product_name: string;
      }>
    >();

    if (orderIds.length > 0) {
      const itemRows = await db
        .select({
          id: orderItems.id,
          order_id: orderItems.order_id,
          wave_product_id: orderItems.wave_product_id,
          quantity: orderItems.quantity,
          subtotal: orderItems.subtotal,
          locked_price: waveProducts.locked_price,
          product_id: products.id,
          product_name: products.name,
        })
        .from(orderItems)
        .innerJoin(
          waveProducts,
          eq(orderItems.wave_product_id, waveProducts.id)
        )
        .innerJoin(products, eq(waveProducts.product_id, products.id))
        .where(inArray(orderItems.order_id, orderIds));

      for (const item of itemRows) {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      }
    }

    const enrichedOrders = orderRows.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) ?? [],
    }));

    if (view === "kanban") {
      const kanban: Record<OrderStatus, typeof enrichedOrders> = {
        Received: [],
        "In Preparation": [],
        "Waiting for Shipment": [],
        "On Shipping": [],
        Delivered: [],
        "Received by Customer": [],
      };

      for (const order of enrichedOrders) {
        const key = order.status as OrderStatus;
        if (kanban[key]) {
          kanban[key].push(order);
        }
      }

      return c.json({
        kanban,
        orders: enrichedOrders,
      });
    }

    return c.json({ orders: enrichedOrders });
  }
);

// GET /api/v1/orders/:id - Get order details by ID
ordersRoutes.get(
  "/:id",
  optionalAuthMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return c.json({ error: "NotFound", message: "Order not found" }, 404);
    }

    const [wave] = await db
      .select()
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, order.wave_id))
      .limit(1);

    const [store] = wave
      ? await db
          .select()
          .from(stores)
          .where(eq(stores.id, wave.store_id))
          .limit(1)
      : [undefined];

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
      .where(eq(orderItems.order_id, id));

    return c.json({
      order: {
        ...order,
        wave: wave ?? null,
        store: store ?? null,
        items,
      },
    });
  }
);

// PATCH /api/v1/orders/:id/status - Advance order status & set courier tracking_number (Store Owner / Admin)
ordersRoutes.patch(
  "/:id/status",
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", updateOrderStatusSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const { status, tracking_number } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return c.json({ error: "NotFound", message: "Order not found" }, 404);
    }

    const [wave] = await db
      .select()
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, order.wave_id))
      .limit(1);

    if (!wave) {
      return c.json(
        { error: "NotFound", message: "Associated pre-order wave not found" },
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

    const resolvedTrackingNumber =
      tracking_number !== undefined ? tracking_number : order.tracking_number;

    await db
      .update(orders)
      .set({
        status,
        tracking_number: resolvedTrackingNumber,
      })
      .where(eq(orders.id, id));

    return c.json({
      order: {
        ...order,
        status,
        tracking_number: resolvedTrackingNumber,
      },
    });
  }
);

// PUT /api/v1/orders/:id/receipt - Upload manual payment receipt to R2
ordersRoutes.put(
  "/:id/receipt",
  optionalAuthMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return c.json({ error: "NotFound", message: "Order not found" }, 404);
    }

    const uploadResult = await uploadImageToR2(c, {
      prefix: "receipts",
      entityId: order.id,
      previousKey: order.payment_receipt_url,
      fieldNames: ["receipt", "file", "image"],
    });

    if (!uploadResult.ok) {
      return c.json(
        { error: uploadResult.error, message: uploadResult.message },
        uploadResult.status
      );
    }

    await db
      .update(orders)
      .set({ payment_receipt_url: uploadResult.objectKey })
      .where(eq(orders.id, id));

    return c.json({
      order: {
        ...order,
        payment_receipt_url: uploadResult.objectKey,
      },
      payment_receipt_url: uploadResult.objectKey,
    });
  }
);

// GET /api/v1/orders/:id/receipt - Stream payment receipt image from R2
ordersRoutes.get(
  "/:id/receipt",
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [order] = await db
      .select({
        id: orders.id,
        payment_receipt_url: orders.payment_receipt_url,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order || !order.payment_receipt_url) {
      return c.json(
        { error: "NotFound", message: "Payment receipt image not found" },
        404
      );
    }

    const response = await streamImageFromR2(
      c.env.BUCKET,
      order.payment_receipt_url
    );
    if (!response) {
      return c.json(
        {
          error: "NotFound",
          message: "Payment receipt object not found in storage",
        },
        404
      );
    }

    return response;
  }
);
