import { AppError } from "@niwa/api-core/errors";

export const BlogErrors = {
  draftNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "BLOG_DRAFT_NOT_FOUND",
      message: "Draft not found",
    }),

  postNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "BLOG_POST_NOT_FOUND",
      message: "Published post not found",
    }),

  publicationNotInitialized: () =>
    new AppError({
      status: 412,
      error: "PreconditionFailed",
      code: "BLOG_PUBLICATION_NOT_INITIALIZED",
      message:
        "Standard.site publication has not been initialized yet. Configure it in Studio Settings first.",
    }),

  slugAlreadyExists: (slug: string) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "BLOG_SLUG_ALREADY_EXISTS",
      message: `A post or draft with slug "${slug}" already exists`,
    }),

  draftIncompleteForPublish: (missingFields: string[]) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "BLOG_DRAFT_INCOMPLETE",
      message: `Draft cannot be published yet. Missing: ${missingFields.join(", ")}`,
      details: { missingFields },
    }),

  atprotoNotConfigured: (detail?: string) =>
    new AppError({
      status: 503,
      error: "ServiceUnavailable",
      code: "ATPROTO_NOT_CONFIGURED",
      message:
        detail ||
        "ATProto credentials or owner DID are not configured on this worker",
    }),

  atprotoAuthFailed: (detail?: string) =>
    new AppError({
      status: 502,
      error: "BadGateway",
      code: "ATPROTO_AUTH_FAILED",
      message: detail || "Failed to authenticate with ATProto PDS",
    }),

  atprotoUpstreamError: (action: string, detail?: string) =>
    new AppError({
      status: 502,
      error: "BadGateway",
      code: "ATPROTO_UPSTREAM_ERROR",
      message: detail
        ? `ATProto PDS error during ${action}: ${detail}`
        : `ATProto PDS error during ${action}`,
    }),

  mediaUnsupportedMimeType: (mimeType: string, allowed: string[]) =>
    new AppError({
      status: 415,
      error: "UnsupportedMediaType",
      code: "BLOG_MEDIA_UNSUPPORTED_MIME",
      message: `Unsupported image type "${mimeType}". Allowed: ${allowed.join(", ")}`,
      details: { mimeType, allowed },
    }),

  mediaEmpty: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "BLOG_MEDIA_EMPTY",
      message: "Uploaded image file is empty",
    }),

  mediaTooLarge: (maxBytes: number, purpose: "inline" | "cover") =>
    new AppError({
      status: 413,
      error: "PayloadTooLarge",
      code:
        purpose === "cover"
          ? "BLOG_COVER_TOO_LARGE_FOR_PDS"
          : "BLOG_MEDIA_TOO_LARGE",
      message:
        purpose === "cover"
          ? `Cover image exceeds the ATProto PDS blob limit (${Math.floor(maxBytes / 1024)} KB max)`
          : `Image exceeds the maximum upload size (${Math.floor(maxBytes / (1024 * 1024))} MB max)`,
      details: { maxBytes, purpose },
    }),

  mediaNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "BLOG_MEDIA_NOT_FOUND",
      message: "Media asset not found",
    }),
};
