import { z } from "zod";

export const ORDER_STATUSES = [
  "Received",
  "In Preparation",
  "Waiting for Shipment",
  "On Shipping",
  "Delivered",
  "Received by Customer",
] as const;

export const orderStatusEnum = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

export const checkoutOrderItemSchema = z.object({
  wave_product_id: z.string().trim().min(1, "WaveProduct ID is required"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be at least 1"),
});

export const checkoutOrderSchema = z.object({
  wave_id: z.string().trim().min(1, "Wave ID is required"),
  shipping_address: z
    .string()
    .trim()
    .min(1, "Shipping address is required")
    .max(1000, "Shipping address must be at most 1000 characters")
    .optional(),
  guest_name: z
    .string()
    .trim()
    .min(2, "Guest name must be at least 2 characters")
    .max(100, "Guest name must be at most 100 characters")
    .optional(),
  guest_whatsapp: z
    .string()
    .trim()
    .min(8, "Guest WhatsApp number must be at least 8 digits")
    .max(25, "Guest WhatsApp number must be at most 25 characters")
    .optional(),
  items: z
    .array(checkoutOrderItemSchema)
    .min(1, "Order must contain at least one item"),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
  tracking_number: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .nullable()
    .optional(),
});

export const orderQuerySchema = z.object({
  store_id: z.string().trim().optional(),
  wave_id: z.string().trim().optional(),
  status: orderStatusEnum.optional(),
  view: z.enum(["list", "kanban"]).optional(),
});

export type CheckoutOrderItemInput = z.infer<typeof checkoutOrderItemSchema>;
export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
