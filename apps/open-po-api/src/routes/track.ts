import { zValidator } from "@hono/zod-validator";
import {
  ORDER_STATUSES,
  guestOrderLookupQuerySchema,
  idParamSchema,
  type OrderStatus,
} from "@niwa/open-po-validators";
import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import {
  createDb,
  orderItems,
  orders,
  preOrderWaves,
  products,
  stores,
  waveProducts,
} from "../db";
import { optionalAuthMiddleware } from "../middleware/auth";
import { checkStoreOwnership } from "../middleware/rbac";
import type { AppEnv } from "../types";
import {
  canUserAccessOrder,
  findOrderByIdOrSlug,
  isSamePhoneNumber,
  lookupOrdersByPhone,
  maskAddress,
  maskName,
  maskPhone,
} from "../utils/order";

export const trackRoutes = new Hono<AppEnv>();

export async function handlePhoneOrderLookup(
  c: Context<AppEnv>,
  query: { phone?: string; whatsapp?: string; store_id?: string }
) {
  const user = c.get("user");
  const targetPhone = (query.phone ?? query.whatsapp)!;
  const db = createDb(c.env.DB);

  if (user && !user.roles.includes("admin")) {
    let isAuthorizedStoreOwner = false;
    if (query.store_id) {
      const ownership = await checkStoreOwnership(db, query.store_id, user);
      isAuthorizedStoreOwner = ownership.ok;
    }

    if (
      !isAuthorizedStoreOwner &&
      !isSamePhoneNumber(user.whatsapp_number, targetPhone)
    ) {
      return c.json(
        {
          error: "Forbidden",
          message:
            "You do not have permission to look up orders belonging to another user's phone number",
        },
        403
      );
    }
  }

  const matchedOrders = await lookupOrdersByPhone(db, targetPhone, {
    storeIdOrSlug: query.store_id,
    viewer: user,
  });

  return c.json({
    phone: user ? targetPhone : maskPhone(targetPhone),
    is_pii_masked: !user,
    total: matchedOrders.length,
    orders: matchedOrders,
  });
}

// GET /api/v1/track?phone=... (or ?whatsapp=...) - Guest/Customer order history lookup by phone number
trackRoutes.get(
  "/",
  optionalAuthMiddleware,
  zValidator("query", guestOrderLookupQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    return handlePhoneOrderLookup(c, query);
  }
);

// GET /api/v1/track/lookup?phone=... (or ?whatsapp=...) - Alias for guest/customer order history lookup by phone number
trackRoutes.get(
  "/lookup",
  optionalAuthMiddleware,
  zValidator("query", guestOrderLookupQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    return handlePhoneOrderLookup(c, query);
  }
);

// GET /api/v1/track/:id - Visual order tracking timeline by Order Slug (or UUID)
// Masks PII for unauthenticated guests, unlocks PII for authenticated order/store owner, and blocks other logged-in users (403)
trackRoutes.get(
  "/:id",
  optionalAuthMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const order = await findOrderByIdOrSlug(db, id);
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
            owner_id: stores.owner_id,
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

    // If a user is logged in, prevent them from viewing another customer's order
    if (user && !canUserAccessOrder(user, order, store?.owner_id)) {
      return c.json(
        {
          error: "Forbidden",
          message:
            "You do not have permission to view another customer's order",
        },
        403
      );
    }

    const rawCustomerName =
      order.customer_name ?? order.guest_name ?? "Customer";
    const rawCustomerPhone =
      order.customer_whatsapp ?? order.guest_whatsapp ?? null;

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
      .where(eq(orderItems.order_id, order.id));

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

    const isUnlocked = Boolean(user);

    return c.json({
      tracking: {
        order_id: order.id,
        order_slug: order.slug,
        status: order.status,
        current_step_index: currentStepIndex,
        timeline,
        tracking_number: order.tracking_number,
        total_amount: order.total_amount,
        has_payment_receipt: Boolean(order.payment_receipt_url),
        payment_receipt_url: isUnlocked ? order.payment_receipt_url : null,
        is_pii_masked: !isUnlocked,
        customer_display_name: isUnlocked
          ? rawCustomerName
          : maskName(rawCustomerName),
        whatsapp_number: isUnlocked
          ? rawCustomerPhone
          : maskPhone(rawCustomerPhone),
        shipping_address: isUnlocked
          ? order.shipping_address
          : maskAddress(order.shipping_address),
        can_review: order.status === "Received by Customer",
        created_at: order.created_at,
        wave: wave ?? null,
        store: store
          ? {
              id: store.id,
              slug: store.slug,
              name: store.name,
              logo_url: store.logo_url,
              payment_instructions: store.payment_instructions,
              whatsapp_contact: store.whatsapp_contact,
            }
          : null,
        items,
      },
    });
  }
);

// PATCH /api/v1/track/:id/confirm-received - Customer confirms order receipt (Delivered -> Received by Customer) by Slug or UUID
trackRoutes.patch(
  "/:id/confirm-received",
  optionalAuthMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const order = await findOrderByIdOrSlug(db, id);
    if (!order) {
      return c.json({ error: "NotFound", message: "Order not found" }, 404);
    }

    const [wave] = await db
      .select({ store_id: preOrderWaves.store_id })
      .from(preOrderWaves)
      .where(eq(preOrderWaves.id, order.wave_id))
      .limit(1);

    const [store] = wave
      ? await db
          .select({ owner_id: stores.owner_id })
          .from(stores)
          .where(eq(stores.id, wave.store_id))
          .limit(1)
      : [undefined];

    // Prevent a logged-in user from confirming another customer's order
    if (user && !canUserAccessOrder(user, order, store?.owner_id)) {
      return c.json(
        {
          error: "Forbidden",
          message:
            "You do not have permission to modify another customer's order",
        },
        403
      );
    }

    // If order belongs to a registered member, require the owner/seller/admin to be logged in
    if (order.customer_id && !user) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Please log in to confirm receipt of a member order",
        },
        401
      );
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
      .where(eq(orders.id, order.id));

    return c.json({
      order: {
        id: order.id,
        slug: order.slug,
        status: "Received by Customer",
      },
    });
  }
);
