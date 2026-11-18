import { z } from "zod";

export const storeSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createStoreSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Store name must be at least 2 characters")
    .max(120, "Store name must be at most 120 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Store slug must be at least 2 characters")
    .max(80, "Store slug must be at most 80 characters")
    .regex(
      storeSlugRegex,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    )
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, "Store description is required")
    .max(2000, "Store description must be at most 2000 characters"),
  payment_instructions: z
    .string()
    .trim()
    .min(1, "Payment instructions are required")
    .max(3000, "Payment instructions must be at most 3000 characters"),
  whatsapp_contact: z
    .string()
    .trim()
    .min(8, "WhatsApp contact must be at least 8 digits")
    .max(25, "WhatsApp contact must be at most 25 characters"),
});

export const updateStoreSchema = createStoreSchema.partial();

export const storeQuerySchema = z.object({
  slug: z.string().trim().optional(),
  owner_id: z.string().trim().optional(),
});

export const idParamSchema = z.object({
  id: z.string().trim().min(1, "ID is required"),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type StoreQueryInput = z.infer<typeof storeQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
