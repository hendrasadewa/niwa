import { AppError } from "./app-error";

export const CommerceErrors = {
  storeNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "OPEN_PO_STORE_NOT_FOUND",
      message: "Store not found",
    }),

  storeSlugConflict: (slug: string) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "OPEN_PO_STORE_SLUG_CONFLICT",
      message: `A store with slug '${slug}' already exists`,
    }),

  storeForbidden: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "OPEN_PO_STORE_FORBIDDEN",
      message: "You do not have permission to manage this store",
    }),

  productNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "OPEN_PO_PRODUCT_NOT_FOUND",
      message: "Product not found",
    }),

  productStoreMismatch: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_PRODUCT_STORE_MISMATCH",
      message: "Product does not belong to the same store as this wave",
    }),

  productArchived: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_PRODUCT_ARCHIVED",
      message: "Archived products cannot be added to a pre-order wave",
    }),

  waveNotFound: (message = "Pre-order wave not found") =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "OPEN_PO_WAVE_NOT_FOUND",
      message,
    }),

  waveInvalidDateRange: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_WAVE_INVALID_DATE_RANGE",
      message: "end_date must be greater than or equal to start_date",
    }),

  waveNotActive: (status: string) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_WAVE_NOT_ACTIVE",
      message: `Pre-order wave is currently '${status}' and not accepting orders`,
    }),

  waveEnded: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_WAVE_ENDED",
      message: "Pre-order wave period has ended",
    }),

  waveProductNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "OPEN_PO_WAVE_PRODUCT_NOT_FOUND",
      message: "Wave product not found in this wave",
    }),

  waveProductHasOrders: () =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "OPEN_PO_WAVE_PRODUCT_HAS_ORDERS",
      message:
        "Cannot remove a wave product that already has customer orders placed against it",
    }),

  waveItemsInvalid: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_ORDER_ITEMS_INVALID",
      message:
        "One or more requested items do not belong to the target pre-order wave",
    }),

  insufficientQuota: (
    productName: string,
    requested: number,
    remaining: number
  ) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "OPEN_PO_INSUFFICIENT_QUOTA",
      message: `Insufficient quota for '${productName}'. Requested: ${requested}, Remaining: ${remaining}`,
    }),

  shippingAddressRequired: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_SHIPPING_ADDRESS_REQUIRED",
      message: "Shipping address is required for checkout",
    }),

  guestCheckoutFieldsRequired: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_GUEST_FIELDS_REQUIRED",
      message:
        "Guest checkout requires both 'guest_name' and 'guest_whatsapp'",
    }),

  orderNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "OPEN_PO_ORDER_NOT_FOUND",
      message: "Order not found",
    }),

  orderSlugConflict: (slug: string) =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "OPEN_PO_ORDER_SLUG_CONFLICT",
      message: `An order with slug '${slug}' already exists`,
    }),

  orderForbidden: (
    message = "You do not have permission to view another customer's order"
  ) =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "OPEN_PO_ORDER_FORBIDDEN",
      message,
    }),

  memberOrderAuthRequired: (message: string) =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "OPEN_PO_MEMBER_ORDER_AUTH_REQUIRED",
      message,
    }),

  orderInvalidStatusForConfirm: (status: string) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_ORDER_INVALID_STATUS",
      message: `Order cannot be marked as 'Received by Customer' while in '${status}' status`,
    }),

  lookupForbidden: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "OPEN_PO_LOOKUP_FORBIDDEN",
      message:
        "You do not have permission to look up orders belonging to another user's phone number",
    }),

  mediaMissingField: (fields: string[]) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_MEDIA_FILE_MISSING",
      message: `Multipart form must include a file field (${fields.join(", ")})`,
    }),

  mediaUnsupportedMime: (mimeType: string, allowed: string[]) =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_MEDIA_UNSUPPORTED_MIME",
      message: `Unsupported image MIME type '${mimeType || "unknown"}'. Allowed: ${allowed.join(", ")}`,
    }),

  mediaEmpty: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_MEDIA_EMPTY",
      message: "Uploaded image is empty",
    }),

  mediaTooLarge: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_MEDIA_TOO_LARGE",
      message: "Uploaded image exceeds maximum size of 10MB",
    }),

  mediaNotFound: (message: string) =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "OPEN_PO_MEDIA_NOT_FOUND",
      message,
    }),

  reviewOwnOrdersOnly: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "OPEN_PO_REVIEW_FORBIDDEN",
      message: "You can only review products from your own orders",
    }),

  reviewOrderNotReceived: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "OPEN_PO_REVIEW_ORDER_NOT_RECEIVED",
      message:
        "Product reviews can only be submitted once the order status is 'Received by Customer'",
    }),

  reviewProductNotInOrder: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "OPEN_PO_REVIEW_PRODUCT_NOT_IN_ORDER",
      message: "The specified product was not part of this order",
    }),

  reviewAlreadyExists: () =>
    new AppError({
      status: 409,
      error: "Conflict",
      code: "OPEN_PO_REVIEW_ALREADY_EXISTS",
      message:
        "You have already submitted a review for this product on this order",
    }),
};
