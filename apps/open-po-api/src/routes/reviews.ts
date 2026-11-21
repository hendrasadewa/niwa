import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { requirePermission } from "../middlewares/rbac";
import { createOrderRepo } from "../repositories/orders";
import { createProductRepo } from "../repositories/products";
import { createReviewRepo } from "../repositories/reviews";
import { createReviewService } from "../services/reviews";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import { createReviewSchema } from "../validators/reviews";

function getReviewService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createReviewService({
    reviewRepo: createReviewRepo(db),
    orderRepo: createOrderRepo(db),
    productRepo: createProductRepo(db),
  });
}

export const reviewsRoutes = new Hono<AppEnv>();

// POST /api/v1/reviews
reviewsRoutes.post(
  "/",
  authMiddleware,
  requirePermission("reviews:write"),
  validate("json", createReviewSchema),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");
    const review = await getReviewService(c).createReview({
      user,
      ...body,
    });
    return c.json({ review }, 201);
  }
);
