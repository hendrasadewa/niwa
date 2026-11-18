import { z } from "zod";

export const createProductSchema = z.object({
  store_id: z.string().trim().min(1, "Store ID is required"),
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(200, "Product name must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Product description is required")
    .max(3000, "Product description must be at most 3000 characters"),
  base_price: z
    .number()
    .int("Base price must be an integer (lowest currency denomination)")
    .nonnegative("Base price cannot be negative"),
  image_url: z.string().trim().min(1).nullable().optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ store_id: true, image_url: true })
  .partial();

export const archiveProductSchema = z.object({
  is_archived: z.boolean(),
});

export const productQuerySchema = z.object({
  store_id: z.string().trim().optional(),
  search: z.string().trim().optional(),
  include_archived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ArchiveProductInput = z.infer<typeof archiveProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
