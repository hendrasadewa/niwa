import { z } from "zod";

const queryBooleanSchema = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

export const createBookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Book title is required")
    .max(255, "Book title must be at most 255 characters"),
  author: z
    .string()
    .trim()
    .min(1, "Author is required")
    .max(255, "Author must be at most 255 characters"),
  isbn: z
    .string()
    .trim()
    .min(10, "ISBN must be at least 10 characters")
    .max(20, "ISBN must be at most 20 characters"),
  total_pages: z
    .number()
    .int("Total pages must be an integer")
    .positive("Total pages must be greater than 0"),
  cover_image_key: z.string().trim().min(1).nullable().optional(),
  bookshelf_id: z.string().trim().min(1).nullable().optional(),
  owner_id: z.string().trim().min(1).nullable().optional(),
  owner_name: z
    .string()
    .trim()
    .min(1, "Owner name cannot be empty")
    .max(100, "Owner name must be at most 100 characters")
    .optional(),
});

export const createBookWithLibrarySchema = createBookSchema.extend({
  library_id: z.string().trim().min(1, "Library ID is required"),
});

export const updateBookSchema = createBookSchema
  .omit({ cover_image_key: true })
  .partial();

export const updateBookLocationSchema = z.object({
  bookshelf_id: z.string().trim().min(1, "Bookshelf ID is required").nullable(),
});

export const bookQuerySchema = z.object({
  search: z.string().trim().optional(),
  library_id: z.string().trim().min(1).optional(),
  bookshelf_id: z.string().trim().min(1).optional(),
  owner_id: z.string().trim().min(1).optional(),
  owned_by_me: queryBooleanSchema.optional(),
});

export const bookIdParamSchema = z.object({
  id: z.string().trim().min(1, "Book ID is required"),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type CreateBookWithLibraryInput = z.infer<
  typeof createBookWithLibrarySchema
>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type UpdateBookLocationInput = z.infer<typeof updateBookLocationSchema>;
export type BookQueryInput = z.infer<typeof bookQuerySchema>;
export type BookIdParam = z.infer<typeof bookIdParamSchema>;
