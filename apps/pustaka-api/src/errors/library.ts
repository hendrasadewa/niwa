import { AppError } from "./app-error";

export const LibraryErrors = {
  bookshelfNotFound: (message = "Bookshelf not found") =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_BOOKSHELF_NOT_FOUND",
      message,
    }),

  bookNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_BOOK_NOT_FOUND",
      message: "Book not found",
    }),

  isbnAlreadyExists: () =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "PUSTAKA_BOOK_ISBN_CONFLICT",
      message: "A book with this ISBN already exists",
    }),

  coverMissingFileField: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_COVER_FILE_MISSING",
      message:
        "Multipart form must include a file field named 'cover' or 'file'",
    }),

  coverUnsupportedMimeType: (mimeType: string, allowed: string[]) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_COVER_UNSUPPORTED_MIME",
      message: `Unsupported image MIME type '${mimeType || "unknown"}'. Allowed: ${allowed.join(", ")}`,
    }),

  coverEmpty: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_COVER_EMPTY",
      message: "Uploaded cover image is empty",
    }),

  coverTooLarge: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_COVER_TOO_LARGE",
      message: "Cover image exceeds maximum size of 10MB",
    }),

  coverNotFound: (message = "Book cover image not found") =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_COVER_NOT_FOUND",
      message,
    }),

  readingListAlreadyExists: () =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "PUSTAKA_READING_LIST_CONFLICT",
      message: "Book is already in your reading list",
    }),

  readingListItemNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_READING_LIST_NOT_FOUND",
      message: "Book not found in your reading list",
    }),

  progressExceedsTotalPages: (lastPageRead: number, totalPages: number) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_PROGRESS_EXCEEDS_TOTAL_PAGES",
      message: `last_page_read (${lastPageRead}) cannot exceed book total_pages (${totalPages})`,
    }),
};
