import { LibraryErrors } from "../errors/library";
import type { BookRepo } from "../repositories/books";
import type { LibraryRepo } from "../repositories/libraries";
import type { LibraryMemberRepo } from "../repositories/library-members";
import type {
  ReadingListRecord,
  ReadingListRepo,
} from "../repositories/reading-lists";
import type { ReadingListWithBook } from "../types/library";
import { createLibraryAccess } from "./library-access";

export type ReadingListServiceDeps = {
  bookRepo: BookRepo;
  readingListRepo: ReadingListRepo;
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
};

export function createReadingListService({
  bookRepo,
  readingListRepo,
  libraryRepo,
  libraryMemberRepo,
}: ReadingListServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  return {
    async listForUser(userId: string): Promise<ReadingListWithBook[]> {
      const memberLibraryIds = await access.getMemberLibraryIds(userId);
      return readingListRepo.listByUserWithBook(userId, memberLibraryIds);
    },

    async addBook(input: {
      userId: string;
      bookId: string;
      status: string;
    }): Promise<ReadingListRecord> {
      const book = await bookRepo.findById(input.bookId);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertCanViewLibraryById(
        book.library_id,
        input.userId,
        () => LibraryErrors.bookNotFound()
      );

      const existing = await readingListRepo.findByUserAndBook(
        input.userId,
        input.bookId
      );
      if (existing) {
        throw LibraryErrors.readingListAlreadyExists();
      }

      return readingListRepo.create({
        id: crypto.randomUUID(),
        user_id: input.userId,
        book_id: input.bookId,
        status: input.status,
        updated_at: Math.floor(Date.now() / 1000),
      });
    },

    async updateStatus(input: {
      userId: string;
      bookId: string;
      status: string;
    }): Promise<ReadingListRecord> {
      const book = await bookRepo.findById(input.bookId);
      if (!book) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertCanViewLibraryById(
        book.library_id,
        input.userId,
        () => LibraryErrors.bookNotFound()
      );

      const existing = await readingListRepo.findByUserAndBook(
        input.userId,
        input.bookId
      );
      if (!existing) {
        throw LibraryErrors.readingListItemNotFound();
      }

      const updatedAt = Math.floor(Date.now() / 1000);
      await readingListRepo.updateStatus(existing.id, input.status, updatedAt);

      return {
        ...existing,
        status: input.status,
        updated_at: updatedAt,
      };
    },
  };
}

export type ReadingListService = ReturnType<typeof createReadingListService>;
