import { LibraryErrors } from "../errors/library";
import type { BookRepo } from "../repositories/books";
import type { ReviewRepo } from "../repositories/reviews";
import type { BookReviewResponse } from "../types/library";

export type ReviewServiceDeps = {
  bookRepo: BookRepo;
  reviewRepo: ReviewRepo;
};

export function createReviewService({
  bookRepo,
  reviewRepo,
}: ReviewServiceDeps) {
  return {
    async listReviews(bookId: string): Promise<BookReviewResponse[]> {
      const book = await bookRepo.findById(bookId);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      return reviewRepo.findByBookId(bookId);
    },

    async createReview(input: {
      bookId: string;
      userId: string;
      username: string;
      rating: number;
      review_text: string;
    }): Promise<BookReviewResponse> {
      const book = await bookRepo.findById(input.bookId);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      return reviewRepo.create({
        id: crypto.randomUUID(),
        user_id: input.userId,
        username: input.username,
        book_id: input.bookId,
        rating: input.rating,
        review_text: input.review_text,
      });
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
