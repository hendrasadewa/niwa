import { z } from "zod";
import { slugSchema, tagsArraySchema } from "./drafts";

export const BLOG_MARKDOWN_LEXICON = "com.hendrasadewa.blog.markdown" as const;
export const STANDARD_PUBLICATION_COLLECTION = "site.standard.publication" as const;
export const STANDARD_DOCUMENT_COLLECTION = "site.standard.document" as const;
export const BSKY_POST_COLLECTION = "app.bsky.feed.post" as const;

export const publishDraftSchema = z.object({
  crosspostToBsky: z.boolean().optional(),
  bskyTeaser: z.string().max(600, "Bluesky teaser text is too long").optional(),
  publishedAt: z.string().datetime({ offset: true }).optional(),
});

export const updatePublishedPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .default(""),
  markdown: z
    .string()
    .min(1, "Article content is required")
    .max(200_000, "Article body is too large"),
  tags: tagsArraySchema.optional().default([]),
  coverImageKey: z.string().trim().min(1).max(300).nullable().optional(),
  keepExistingCover: z.boolean().optional().default(true),
});

export const unpublishPostSchema = z.object({
  deleteBskyPost: z.boolean().optional().default(false),
});

export const upsertPublicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Publication name is required")
    .max(120, "Publication name must be at most 120 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Publication description must be at most 500 characters")
    .optional()
    .default(""),
  url: z
    .string()
    .trim()
    .url("Publication URL must be a valid URL")
    .refine(
      (val) => val.startsWith("https://") || val.startsWith("http://"),
      "Publication URL must start with http:// or https://"
    )
    .optional(),
});

export type PublishDraftInput = z.infer<typeof publishDraftSchema>;
export type UpdatePublishedPostInput = z.infer<typeof updatePublishedPostSchema>;
export type UnpublishPostInput = z.infer<typeof unpublishPostSchema>;
export type UpsertPublicationInput = z.infer<typeof upsertPublicationSchema>;

export interface AtprotoStrongRef {
  uri: string;
  cid: string;
}

export interface AtprotoBlobRef {
  $type: "blob";
  ref: {
    $link: string;
  };
  mimeType: string;
  size: number;
}

export interface StandardPublicationDto {
  uri: string;
  cid: string;
  rkey: string;
  did: string;
  url: string;
  name: string;
  description: string;
  iconCid: string | null;
  iconUrl: string | null;
}

export interface StandardDocumentSummaryDto {
  uri: string;
  cid: string;
  rkey: string;
  site: string;
  slug: string;
  path: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string | null;
  tags: string[];
  coverImageCid: string | null;
  coverImageUrl: string | null;
  bskyPostRef: AtprotoStrongRef | null;
  readingTimeMinutes: number;
}

export interface StandardDocumentDto extends StandardDocumentSummaryDto {
  markdown: string;
  textContent: string;
}

export interface BskyPostAuthorDto {
  did: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
}

export interface BskyThreadPostDto {
  uri: string;
  cid: string;
  webUrl: string;
  author: BskyPostAuthorDto;
  text: string;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
  replies: BskyThreadPostDto[];
}
