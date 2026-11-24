import { AppError } from "@niwa/api-core/errors";

export const LibraryErrors = {
  libraryNotFound: (message = "Library not found") =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_LIBRARY_NOT_FOUND",
      message,
    }),

  librarySlugConflict: (slug: string) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "PUSTAKA_LIBRARY_SLUG_CONFLICT",
      message: `A library with slug '${slug}' already exists`,
    }),

  libraryForbidden: (
    message = "Only the library owner can perform this action"
  ) =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "PUSTAKA_LIBRARY_FORBIDDEN",
      message,
    }),

  libraryNotEmpty: (bookCount: number) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "PUSTAKA_LIBRARY_NOT_EMPTY",
      message: `Cannot delete library while it still contains ${bookCount} book(s). Remove all books first.`,
    }),

  bookshelfNotFound: (message = "Bookshelf not found") =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_BOOKSHELF_NOT_FOUND",
      message,
    }),

  bookshelfWrongLibrary: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_BOOKSHELF_WRONG_LIBRARY",
      message: "Target bookshelf does not belong to this library",
    }),

  bookNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_BOOK_NOT_FOUND",
      message: "Book not found",
    }),

  ownerNotMember: (
    message = "Assigned owner must be the library owner or a current library member"
  ) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_OWNER_NOT_MEMBER",
      message,
    }),

  ownerNameRequired: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_OWNER_NAME_REQUIRED",
      message:
        "owner_name is required when owner_id is null (non-account book owner)",
    }),

  memberNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_LIBRARY_MEMBER_NOT_FOUND",
      message: "Member not found in this library",
    }),

  alreadyLibraryMember: (
    message = "You are already a member or owner of this library"
  ) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "PUSTAKA_LIBRARY_ALREADY_MEMBER",
      message,
    }),

  cannotLeaveAsOwner: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_CANNOT_LEAVE_AS_OWNER",
      message:
        "Library owner cannot leave the library. Transfer ownership first or delete the library.",
    }),

  cannotTransferToSelf: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "PUSTAKA_CANNOT_TRANSFER_TO_SELF",
      message: "You are already the owner of this library",
    }),

  inviteNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "PUSTAKA_INVITE_NOT_FOUND",
      message: "Library invite not found",
    }),

  inviteRevoked: () =>
    new AppError({
      status: 410,
      error: "Gone",
      code: "PUSTAKA_INVITE_REVOKED",
      message: "This invite link has been revoked",
    }),

  inviteExpired: () =>
    new AppError({
      status: 410,
      error: "Gone",
      code: "PUSTAKA_INVITE_EXPIRED",
      message: "This invite link has expired",
    }),

  inviteMaxUsesReached: () =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "PUSTAKA_INVITE_MAX_USES_REACHED",
      message: "This invite link has reached its maximum number of uses",
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
