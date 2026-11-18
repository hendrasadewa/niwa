import { zValidator } from "@hono/zod-validator";
import { createReviewSchema } from "@niwa/open-po-validators";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createDb,
  orderItems,
  products,
  reviews,
  waveProducts,
} from "../db";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppEnv } from "../types";
import { findOrderByIdOrSlug } from "../utils/order";

export const reviewsRoutes = new Hono<AppEnv>();

// POST /api/v1/reviews - Submit a 1-5 star product review for a 'Received by Customer' order
reviewsRoutes.post(
  "/",
  authMiddleware,
  requirePermission("reviews:write"),
  zValidator("json", createReviewSchema),
  async (c) => {
    const user = c.get("user")!;
    const { order_id, product_id, rating, comment } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const order = await findOrderByIdOrSlug(db, order_id);
    if (!order) {
      return c.json({ error: "NotFound", message: "Order not found" }, 404);
    }

    if (order.customer_id !== user.id && !user.roles.includes("admin")) {
      return c.json(
        {
          error: "Forbidden",
          message: "You can only review products from your own orders",
        },
        403
      );
    }

    if (order.status !== "Received by Customer") {
      return c.json(
        {
          error: "Forbidden",
          message:
            "Product reviews can only be submitted once the order status is 'Received by Customer'",
        },
        403
      );
    }

    const [product] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, product_id))
      .limit(1);

    if (!product) {
      return c.json({ error: "NotFound", message: "Product not found" }, 404);
    }

    // Verify the product was actually ordered in this order
    const [orderedProductItem] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(
        waveProducts,
        eq(orderItems.wave_product_id, waveProducts.id)
      )
      .where(
        and(
          eq(orderItems.order_id, order.id),
          eq(waveProducts.product_id, product_id)
        )
      )
      .limit(1);

    if (!orderedProductItem) {
      return c.json(
        {
          error: "BadRequest",
          message: "The specified product was not part of this order",
        },
        400
      );
    }

    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.order_id, order.id),
          eq(reviews.product_id, product_id),
          eq(reviews.customer_id, user.id)
        )
      )
      .limit(1);

    if (existingReview) {
      return c.json(
        {
          error: "Conflict",
          message:
            "You have already submitted a review for this product on this order",
        },
        409
      );
    }

    const newReview = {
      id: crypto.randomUUID(),
      product_id,
      order_id: order.id,
      customer_id: user.id,
      rating,
      comment,
      created_at: Math.floor(Date.now() / 1000),
    };

    await db.insert(reviews).values(newReview);

    return c.json(
      {
        review: {
          ...newReview,
          order_slug: order.slug,
          customer_name: user.name,
        },
      },
      201
    );
  }
);
