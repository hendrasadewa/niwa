import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120, "Slug must be at most 120 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and single hyphens only"
  );

export const tagSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^#+/, "").trim())
  .pipe(
    z
      .string()
      .min(1, "Tag cannot be empty")
      .max(40, "Tag must be at most 40 characters")
  );

export const tagsArraySchema = z
  .array(tagSchema)
  .max(10, "At most 10 tags are allowed")
  .transform((tags) => Array.from(new Set(tags)));

export const createDraftSchema = z.object({
  title: z.string().trim().max(200, "Title must be at most 200 characters").optional().default(""),
  slug: slugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .default(""),
  markdown: z
    .string()
    .max(200_000, "Article body is too large (max 200,000 characters)")
    .optional()
    .default(""),
  tags: tagsArraySchema.optional().default([]),
  coverImageKey: z.string().trim().min(1).max(300).nullable().optional(),
  bskyTeaser: z
    .string()
    .max(600, "Bluesky teaser text is too long")
    .optional()
    .default(""),
  crosspostToBsky: z.boolean().optional().default(true),
});

export const updateDraftSchema = z.object({
  title: z.string().trim().max(200, "Title must be at most 200 characters").optional(),
  slug: slugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  markdown: z
    .string()
    .max(200_000, "Article body is too large (max 200,000 characters)")
    .optional(),
  tags: tagsArraySchema.optional(),
  coverImageKey: z.string().trim().min(1).max(300).nullable().optional(),
  bskyTeaser: z
    .string()
    .max(600, "Bluesky teaser text is too long")
    .optional(),
  crosspostToBsky: z.boolean().optional(),
});

export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;

export interface DraftDto {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  description: string;
  markdown: string;
  tags: string[];
  coverImageKey: string | null;
  coverImageUrl: string | null;
  bskyTeaser: string;
  crosspostToBsky: boolean;
  createdAt: number;
  updatedAt: number;
}
