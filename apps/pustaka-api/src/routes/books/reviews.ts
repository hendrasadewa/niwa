import { Hono, type Context } from "hono";
import {
  authMiddleware,
  getOptionalUser,
  optionalAuthMiddleware,
} from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import { createBookRepo } from "../../repositories/books";
import { createLibraryRepo } from "../../repositories/libraries";
import { createLibraryMemberRepo } from "../../repositories/library-members";
import { createReviewRepo } from "../../repositories/reviews";
import { createReviewService } from "../../services/reviews";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import { bookIdParamSchema, createReviewSchema } from "../../validators/books";

function getReviewService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createReviewService({
    bookRepo: createBookRepo(db),
    reviewRepo: createReviewRepo(db),
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
  });
}

export const bookReviewsRoutes = new Hono<AppEnv>();

// GET /api/v1/books/:id/reviews (visibility-scoped read)
bookReviewsRoutes.get(
  "/:id/reviews",
  optionalAuthMiddleware,
  validate("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const reviews = await getReviewService(c).listReviews(
      id,
      getOptionalUser(c)
    );
    return c.json({ reviews });
  }
);

// POST /api/v1/books/:id/reviews
bookReviewsRoutes.post(
  "/:id/reviews",
  authMiddleware,
  requirePermission("reviews:write"),
  validate("param", bookIdParamSchema),
  validate("json", createReviewSchema),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const { rating, review_text } = c.req.valid("json");
    const review = await getReviewService(c).createReview({
      bookId: id,
      userId: user.id,
      username: user.username,
      rating,
      review_text,
    });
    return c.json({ review }, 201);
  }
);
