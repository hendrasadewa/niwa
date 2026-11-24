import { z } from "zod";

export const createBookshelfSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bookshelf name is required")
    .max(100, "Bookshelf name must be at most 100 characters"),
  location: z
    .string()
    .trim()
    .min(1, "Bookshelf location is required")
    .max(255, "Bookshelf location must be at most 255 characters"),
});

export const createBookshelfWithLibrarySchema = createBookshelfSchema.extend({
  library_id: z.string().trim().min(1, "Library ID is required"),
});

export const updateBookshelfSchema = createBookshelfSchema.partial();

export const bookshelfIdParamSchema = z.object({
  id: z.string().trim().min(1, "Bookshelf ID is required"),
});

export const bookshelfQuerySchema = z.object({
  library_id: z.string().trim().min(1).optional(),
});

export type CreateBookshelfInput = z.infer<typeof createBookshelfSchema>;
export type CreateBookshelfWithLibraryInput = z.infer<
  typeof createBookshelfWithLibrarySchema
>;
export type UpdateBookshelfInput = z.infer<typeof updateBookshelfSchema>;
export type BookshelfIdParam = z.infer<typeof bookshelfIdParamSchema>;
export type BookshelfQueryInput = z.infer<typeof bookshelfQuerySchema>;
