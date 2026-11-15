import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  review_text: z
    .string()
    .trim()
    .min(1, "Review text is required")
    .max(2000, "Review text must be at most 2000 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
