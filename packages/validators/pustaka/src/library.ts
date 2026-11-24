import { z } from "zod";

export const LIBRARY_VISIBILITIES = ["private", "public"] as const;
export type LibraryVisibility = (typeof LIBRARY_VISIBILITIES)[number];

export const libraryVisibilitySchema = z.enum(LIBRARY_VISIBILITIES);

export const librarySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters")
  .max(80, "Slug must be at most 80 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  );

export const createLibrarySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Library name is required")
    .max(100, "Library name must be at most 100 characters"),
  slug: librarySlugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  visibility: libraryVisibilitySchema.optional().default("private"),
});

export const updateLibrarySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Library name is required")
    .max(100, "Library name must be at most 100 characters")
    .optional(),
  slug: librarySlugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  visibility: libraryVisibilitySchema.optional(),
});

export const libraryIdParamSchema = z.object({
  libraryId: z.string().trim().min(1, "Library ID is required"),
});

export const LIBRARY_SCOPES = ["mine", "public", "all"] as const;
export type LibraryScope = (typeof LIBRARY_SCOPES)[number];

export const libraryQuerySchema = z.object({
  scope: z.enum(LIBRARY_SCOPES).optional(),
  search: z.string().trim().optional(),
});

export const transferLibraryOwnershipSchema = z.object({
  new_owner_id: z.string().trim().min(1, "New owner user ID is required"),
});

export const memberUserIdParamSchema = z.object({
  libraryId: z.string().trim().min(1, "Library ID is required"),
  userId: z.string().trim().min(1, "Member user ID is required"),
});

export const createLibraryInviteSchema = z.object({
  max_uses: z
    .number()
    .int("Max uses must be an integer")
    .positive("Max uses must be greater than 0")
    .max(1000, "Max uses must be at most 1000")
    .nullable()
    .optional(),
  expires_in_hours: z
    .number()
    .int("Expiration hours must be an integer")
    .positive("Expiration hours must be greater than 0")
    .max(24 * 365, "Expiration cannot exceed 1 year")
    .nullable()
    .optional(),
});

export const inviteIdParamSchema = z.object({
  libraryId: z.string().trim().min(1, "Library ID is required"),
  inviteId: z.string().trim().min(1, "Invite ID is required"),
});

export const inviteCodeParamSchema = z.object({
  code: z.string().trim().min(1, "Invite code is required"),
});

export type CreateLibraryInput = z.infer<typeof createLibrarySchema>;
export type UpdateLibraryInput = z.infer<typeof updateLibrarySchema>;
export type LibraryIdParam = z.infer<typeof libraryIdParamSchema>;
export type LibraryQueryInput = z.infer<typeof libraryQuerySchema>;
export type TransferLibraryOwnershipInput = z.infer<
  typeof transferLibraryOwnershipSchema
>;
export type MemberUserIdParam = z.infer<typeof memberUserIdParamSchema>;
export type CreateLibraryInviteInput = z.infer<
  typeof createLibraryInviteSchema
>;
export type InviteIdParam = z.infer<typeof inviteIdParamSchema>;
export type InviteCodeParam = z.infer<typeof inviteCodeParamSchema>;
