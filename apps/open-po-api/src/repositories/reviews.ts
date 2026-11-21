import { and, desc, eq, sql } from "drizzle-orm";
import { reviews, type Database } from "../db";
import type { ReviewSummary } from "../types/commerce";

export type ReviewRecord = typeof reviews.$inferSelect;
export type NewReviewRecord = typeof reviews.$inferInsert;

export function createReviewRepo(db: Database) {
  return {
    async findByProductId(productId: string): Promise<ReviewRecord[]> {
      return db
        .select({
          id: reviews.id,
          product_id: reviews.product_id,
          order_id: reviews.order_id,
          customer_id: reviews.customer_id,
          customer_name: reviews.customer_name,
          rating: reviews.rating,
          comment: reviews.comment,
          created_at: reviews.created_at,
        })
        .from(reviews)
        .where(eq(reviews.product_id, productId))
        .orderBy(desc(reviews.created_at));
    },

    async getSummaryByProductId(productId: string): Promise<ReviewSummary> {
      const [stats] = await db
        .select({
          average_rating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
          total_reviews: sql<number>`count(${reviews.id})`,
        })
        .from(reviews)
        .where(eq(reviews.product_id, productId));

      return {
        average_rating: Number(Number(stats?.average_rating ?? 0).toFixed(2)),
        total_reviews: Number(stats?.total_reviews ?? 0),
      };
    },

    async findByOrderProductCustomer(
      orderId: string,
      productId: string,
      customerId: string
    ): Promise<{ id: string } | null> {
      const [row] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(
            eq(reviews.order_id, orderId),
            eq(reviews.product_id, productId),
            eq(reviews.customer_id, customerId)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async create(input: NewReviewRecord): Promise<ReviewRecord> {
      await db.insert(reviews).values(input);
      return input;
    },
  };
}

export type ReviewRepo = ReturnType<typeof createReviewRepo>;
