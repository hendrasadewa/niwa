import { zValidator } from "@hono/zod-validator";
import {
  ORDER_STATUSES,
  idParamSchema,
  type OrderStatus,
} from "@niwa/open-po-validators";
import { eq } from "drizzle-orm";
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
import { optionalAuthMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

export const trackRoutes = new Hono<AppEnv>();

// GET /api/v1/track/:id - Public visual order tracking timeline by Order ID
trackRoutes.get("/:id", zValidator("param", idParamSchema), async (c) => {
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
    .select({
      id: preOrderWaves.id,
      name: preOrderWaves.name,
      status: preOrderWaves.status,
      store_id: preOrderWaves.store_id,
    })
    .from(preOrderWaves)
    .where(eq(preOrderWaves.id, order.wave_id))
    .limit(1);

  const [store] = wave
    ? await db
        .select({
          id: stores.id,
          slug: stores.slug,
          name: stores.name,
          logo_url: stores.logo_url,
          payment_instructions: stores.payment_instructions,
          whatsapp_contact: stores.whatsapp_contact,
        })
        .from(stores)
        .where(eq(stores.id, wave.store_id))
        .limit(1)
    : [undefined];

  let customerDisplayName = order.guest_name ?? "Customer";
  if (order.customer_id) {
    const [customer] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, order.customer_id))
      .limit(1);
    if (customer) {
      customerDisplayName = customer.name;
    }
  }

  const items = await db
    .select({
      id: orderItems.id,
      wave_product_id: orderItems.wave_product_id,
      product_id: products.id,
      product_name: products.name,
      product_image_url: products.image_url,
      locked_price: waveProducts.locked_price,
      quantity: orderItems.quantity,
      subtotal: orderItems.subtotal,
    })
    .from(orderItems)
    .innerJoin(waveProducts, eq(orderItems.wave_product_id, waveProducts.id))
    .innerJoin(products, eq(waveProducts.product_id, products.id))
    .where(eq(orderItems.order_id, id));

  const currentStepIndex = Math.max(
    0,
    ORDER_STATUSES.indexOf(order.status as OrderStatus)
  );

  const timeline = ORDER_STATUSES.map((stepStatus, idx) => ({
    status: stepStatus,
    step_index: idx,
    is_completed: idx <= currentStepIndex,
    is_current: idx === currentStepIndex,
  }));

  return c.json({
    tracking: {
      order_id: order.id,
      status: order.status,
      current_step_index: currentStepIndex,
      timeline,
      tracking_number: order.tracking_number,
      total_amount: order.total_amount,
      has_payment_receipt: Boolean(order.payment_receipt_url),
      payment_receipt_url: order.payment_receipt_url,
      customer_display_name: customerDisplayName,
      can_review: order.status === "Received by Customer",
      created_at: order.created_at,
      wave: wave ?? null,
      store: store ?? null,
      items,
    },
  });
});

// PATCH /api/v1/track/:id/confirm-received - Customer confirms order receipt (Delivered -> Received by Customer)
trackRoutes.patch(
  "/:id/confirm-received",
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

    if (
      order.status !== "Delivered" &&
      order.status !== "On Shipping" &&
      order.status !== "Received by Customer"
    ) {
      return c.json(
        {
          error: "BadRequest",
          message: `Order cannot be marked as 'Received by Customer' while in '${order.status}' status`,
        },
        400
      );
    }

    await db
      .update(orders)
      .set({ status: "Received by Customer" })
      .where(eq(orders.id, id));

    return c.json({
      order: {
        ...order,
        status: "Received by Customer",
      },
    });
  }
);
