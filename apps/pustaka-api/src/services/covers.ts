import { LibraryErrors } from "../errors/library";
import type { BookRecord, BookRepo } from "../repositories/books";
import type { CoverStorageRepo } from "../repositories/cover-storage";
import type { LibraryRepo } from "../repositories/libraries";
import type { LibraryMemberRepo } from "../repositories/library-members";
import type { AuthUser } from "../types/auth";
import { createLibraryAccess } from "./library-access";

const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const MAX_COVER_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type CoverServiceDeps = {
  bookRepo: BookRepo;
  coverStorageRepo: CoverStorageRepo;
  libraryRepo: LibraryRepo;
  libraryMemberRepo: LibraryMemberRepo;
};

export function createCoverService({
  bookRepo,
  coverStorageRepo,
  libraryRepo,
  libraryMemberRepo,
}: CoverServiceDeps) {
  const access = createLibraryAccess({ libraryRepo, libraryMemberRepo });

  return {
    async uploadCover(
      input: {
        bookId: string;
        mimeType: string;
        fileBuffer: ArrayBuffer;
      },
      actor: AuthUser
    ): Promise<{ book: BookRecord; cover_image_key: string }> {
      const existingBook = await bookRepo.findById(input.bookId);
      if (!existingBook) {
        throw LibraryErrors.bookNotFound();
      }

      await access.assertLibraryOwnerById(
        existingBook.library_id,
        actor.id,
        () => LibraryErrors.bookNotFound()
      );

      const normalizedMime = input.mimeType.toLowerCase();
      const extension = ALLOWED_IMAGE_MIME_TYPES[normalizedMime];
      if (!extension) {
        throw LibraryErrors.coverUnsupportedMimeType(
          normalizedMime,
          Object.keys(ALLOWED_IMAGE_MIME_TYPES)
        );
      }

      if (!input.fileBuffer || input.fileBuffer.byteLength === 0) {
        throw LibraryErrors.coverEmpty();
      }

      if (input.fileBuffer.byteLength > MAX_COVER_SIZE_BYTES) {
        throw LibraryErrors.coverTooLarge();
      }

      const objectKey = `covers/${input.bookId}/${crypto.randomUUID()}.${extension}`;

      await coverStorageRepo.put(objectKey, input.fileBuffer, normalizedMime);

      if (
        existingBook.cover_image_key &&
        existingBook.cover_image_key !== objectKey
      ) {
        await coverStorageRepo.delete(existingBook.cover_image_key);
      }

      await bookRepo.updateCoverKey(input.bookId, objectKey);

      return {
        book: {
          ...existingBook,
          cover_image_key: objectKey,
        },
        cover_image_key: objectKey,
      };
    },

    async getCover(
      bookId: string,
      actor: AuthUser | null
    ): Promise<{ object: R2ObjectBody; isPublic: boolean }> {
      const book = await bookRepo.findById(bookId);
      if (!book) {
        throw LibraryErrors.coverNotFound("Book cover image not found");
      }

      const { library } = await access.assertCanViewLibraryById(
        book.library_id,
        actor?.id ?? null,
        () => LibraryErrors.coverNotFound("Book cover image not found")
      );

      if (!book.cover_image_key) {
        throw LibraryErrors.coverNotFound("Book cover image not found");
      }

      const object = await coverStorageRepo.get(book.cover_image_key);
      if (!object) {
        throw LibraryErrors.coverNotFound("Cover object not found in storage");
      }

      return {
        object,
        isPublic: library.visibility === "public",
      };
    },
  };
}

export type CoverService = ReturnType<typeof createCoverService>;
