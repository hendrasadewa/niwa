import { z } from "zod";

export const createReviewSchema = z.object({
  order_id: z.string().trim().min(1, "Order ID is required"),
  product_id: z.string().trim().min(1, "Product ID is required"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z
    .string()
    .trim()
    .min(1, "Review comment is required")
    .max(2000, "Review comment must be at most 2000 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
