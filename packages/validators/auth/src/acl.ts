import { z } from "zod";

const slugPattern = /^[a-z0-9][a-z0-9:_-]*$/;

export const appFilterQuerySchema = z.object({
  app_id: z.string().trim().min(1).max(64).optional(),
});

export const createAppSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "App ID must be at least 2 characters")
    .max(64, "App ID must be at most 64 characters")
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      "App ID must contain only lowercase letters, numbers, and hyphens"
    ),
  name: z
    .string()
    .trim()
    .min(2, "App name must be at least 2 characters")
    .max(100, "App name must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
  allowed_origins: z.array(z.string().trim().url()).max(50).optional(),
  allowed_redirect_uris: z.array(z.string().trim().url()).max(50).optional(),
  default_role_name: z.string().trim().min(1).max(64).nullable().optional(),
  require_consent: z.boolean().optional(),
  icon_url: z.string().trim().url().max(500).nullable().optional(),
});

export const updateAppSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "App name must be at least 2 characters")
    .max(100, "App name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters")
    .optional(),
  allowed_origins: z.array(z.string().trim().url()).max(50).optional(),
  allowed_redirect_uris: z.array(z.string().trim().url()).max(50).optional(),
  default_role_name: z.string().trim().min(1).max(64).nullable().optional(),
  require_consent: z.boolean().optional(),
  icon_url: z.string().trim().url().max(500).nullable().optional(),
});

export const createRoleSchema = z.object({
  app_id: z.string().trim().min(1, "App ID is required").max(64),
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Role name must be at least 2 characters")
    .max(64, "Role name must be at most 64 characters")
    .regex(
      slugPattern,
      "Role name must contain only lowercase letters, numbers, colons, hyphens, or underscores"
    ),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
  permission_slugs: z.array(z.string().trim().min(1).max(100)).optional(),
});

export const updateRolePermissionsSchema = z.object({
  permission_slugs: z
    .array(z.string().trim().min(1).max(100))
    .max(200, "Too many permissions"),
});

export const createPermissionSchema = z.object({
  app_id: z.string().trim().min(1, "App ID is required").max(64),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Permission slug must be at least 2 characters")
    .max(100, "Permission slug must be at most 100 characters")
    .regex(
      slugPattern,
      "Permission slug must contain only lowercase letters, numbers, colons, hyphens, or underscores"
    ),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
});

export const aclUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  app_id: z.string().trim().min(1).max(64).optional(),
  role: z.string().trim().min(1).max(64).optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

export const userRoleMutationSchema = z.object({
  app_id: z.string().trim().min(1, "App ID is required").max(64),
  role: z.string().trim().min(1, "Role name is required").max(64),
});

export const setUserAppRolesSchema = z.object({
  app_id: z.string().trim().min(1, "App ID is required").max(64),
  roles: z
    .array(z.string().trim().min(1).max(64))
    .max(50, "Too many roles specified"),
});

export const roleIdParamSchema = z.object({
  roleId: z.string().trim().min(1, "Role ID is required").max(128),
});

export const permissionIdParamSchema = z.object({
  permissionId: z.string().trim().min(1, "Permission ID is required").max(128),
});

export const userIdParamSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required").max(128),
});

export type CreateAppInput = z.infer<typeof createAppSchema>;
export type UpdateAppInput = z.infer<typeof updateAppSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRolePermissionsInput = z.infer<
  typeof updateRolePermissionsSchema
>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type AclUsersQueryInput = z.infer<typeof aclUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UserRoleMutationInput = z.infer<typeof userRoleMutationSchema>;
export type SetUserAppRolesInput = z.infer<typeof setUserAppRolesSchema>;
