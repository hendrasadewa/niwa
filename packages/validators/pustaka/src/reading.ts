import { z } from "zod";

export const readingStatusSchema = z.enum([
  "want_to_read",
  "reading",
  "completed",
  "on_hold",
  "dropped",
]);

export const addReadingListSchema = z.object({
  book_id: z.string().trim().min(1, "Book ID is required"),
  status: readingStatusSchema.default("want_to_read"),
});

export const updateReadingListStatusSchema = z.object({
  status: readingStatusSchema,
});

export const bookIdRouteParamSchema = z.object({
  book_id: z.string().trim().min(1, "Book ID is required"),
});

export const updateReadingProgressSchema = z.object({
  last_page_read: z
    .number()
    .int("Last page read must be an integer")
    .min(0, "Last page read cannot be negative"),
});

export type ReadingStatus = z.infer<typeof readingStatusSchema>;
export type AddReadingListInput = z.infer<typeof addReadingListSchema>;
export type UpdateReadingListStatusInput = z.infer<
  typeof updateReadingListStatusSchema
>;
export type BookIdRouteParam = z.infer<typeof bookIdRouteParamSchema>;
export type UpdateReadingProgressInput = z.infer<
  typeof updateReadingProgressSchema
>;
