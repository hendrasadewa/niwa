import { LibraryErrors } from "../errors/library";
import type { BookRepo } from "../repositories/books";
import type { LibraryRepo } from "../repositories/libraries";
import type { LibraryMemberRepo } from "../repositories/library-members";
import type { ReadingProgressRepo } from "../repositories/reading-progress";
import type { ReadingProgressResponse } from "../types/library";
import { createLibraryAccess } from "./library-access";

export type ReadingProgressServiceDeps = {
  bookRepo: BookRepo;
  readingProgressRepo: ReadingProgressRepo;
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
};

function computePercentage(lastPageRead: number, totalPages: number): number {
  return totalPages > 0 ? Math.round((lastPageRead / totalPages) * 100) : 0;
}

export function createReadingProgressService({
  bookRepo,
  readingProgressRepo,
  libraryRepo,
  libraryMemberRepo,
}: ReadingProgressServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  return {
    async getProgress(
      userId: string,
      bookId: string
    ): Promise<ReadingProgressResponse> {
      const book = await bookRepo.findById(bookId);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertCanViewLibraryById(
        book.library_id,
        userId,
        () => LibraryErrors.bookNotFound()
      );

      const record = await readingProgressRepo.findByUserAndBook(
        userId,
        bookId
      );
      const lastPageRead = record?.last_page_read ?? 0;

      return {
        id: record?.id ?? null,
        user_id: userId,
        book_id: bookId,
        last_page_read: lastPageRead,
        total_pages: book.total_pages,
        percentage: computePercentage(lastPageRead, book.total_pages),
        updated_at: record?.updated_at ?? null,
      };
    },

    async updateProgress(input: {
      userId: string;
      bookId: string;
      lastPageRead: number;
    }): Promise<ReadingProgressResponse> {
      const book = await bookRepo.findById(input.bookId);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertCanViewLibraryById(
        book.library_id,
        input.userId,
        () => LibraryErrors.bookNotFound()
      );

      if (input.lastPageRead > book.total_pages) {
        throw LibraryErrors.progressExceedsTotalPages(
          input.lastPageRead,
          book.total_pages
        );
      }

      const existing = await readingProgressRepo.findByUserAndBook(
        input.userId,
        input.bookId
      );
      const updatedAt = Math.floor(Date.now() / 1000);
      let progressId: string;

      if (existing) {
        progressId = existing.id;
        await readingProgressRepo.update(
          existing.id,
          input.lastPageRead,
          updatedAt
        );
      } else {
        progressId = crypto.randomUUID();
        await readingProgressRepo.create({
          id: progressId,
          user_id: input.userId,
          book_id: input.bookId,
          last_page_read: input.lastPageRead,
          updated_at: updatedAt,
        });
      }

      return {
        id: progressId,
        user_id: input.userId,
        book_id: input.bookId,
        last_page_read: input.lastPageRead,
        total_pages: book.total_pages,
        percentage: computePercentage(input.lastPageRead, book.total_pages),
        updated_at: updatedAt,
      };
    },
  };
}

export type ReadingProgressService = ReturnType<
  typeof createReadingProgressService
>;
