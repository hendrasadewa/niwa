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

export const updateBookshelfSchema = createBookshelfSchema.partial();

export type CreateBookshelfInput = z.infer<typeof createBookshelfSchema>;
export type UpdateBookshelfInput = z.infer<typeof updateBookshelfSchema>;
