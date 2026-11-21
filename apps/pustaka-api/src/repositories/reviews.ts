import { eq } from "drizzle-orm";
import { bookReviews, type Database } from "../db";
import type { BookReviewResponse } from "../types/library";

export type NewBookReviewRecord = typeof bookReviews.$inferInsert;

export function createReviewRepo(db: Database) {
  return {
    async findByBookId(bookId: string): Promise<BookReviewResponse[]> {
      return db
        .select({
          id: bookReviews.id,
          user_id: bookReviews.user_id,
          username: bookReviews.username,
          book_id: bookReviews.book_id,
          rating: bookReviews.rating,
          review_text: bookReviews.review_text,
        })
        .from(bookReviews)
        .where(eq(bookReviews.book_id, bookId));
    },

    async create(input: NewBookReviewRecord): Promise<BookReviewResponse> {
      await db.insert(bookReviews).values(input);
      return input;
    },
  };
}

export type ReviewRepo = ReturnType<typeof createReviewRepo>;
