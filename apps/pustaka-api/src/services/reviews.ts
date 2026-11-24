import { LibraryErrors } from "../errors/library";
import type { BookRepo } from "../repositories/books";
import type { LibraryRepo } from "../repositories/libraries";
import type { LibraryMemberRepo } from "../repositories/library-members";
import type { ReviewRepo } from "../repositories/reviews";
import type { AuthUser } from "../types/auth";
import type { BookReviewResponse } from "../types/library";
import { createLibraryAccess } from "./library-access";

export type ReviewServiceDeps = {
  bookRepo: BookRepo;
  reviewRepo: ReviewRepo;
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
};

export function createReviewService({
  bookRepo,
  reviewRepo,
  libraryRepo,
  libraryMemberRepo,
}: ReviewServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  return {
    async listReviews(
      bookId: string,
      actor: AuthUser | null
    ): Promise<BookReviewResponse[]> {
      const book = await bookRepo.findById(bookId);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertCanViewLibraryById(
        book.library_id,
        actor?.id ?? null,
        () => LibraryErrors.bookNotFound()
      );

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

      await access.assertCanViewLibraryById(
        book.library_id,
        input.userId,
        () => LibraryErrors.bookNotFound()
      );

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
