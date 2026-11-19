import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  whatsapp_number: z
    .string()
    .trim()
    .min(8, "WhatsApp number must be at least 8 digits")
    .max(25, "WhatsApp number must be at most 25 characters"),
  app_id: z
    .string()
    .trim()
    .min(1, "App ID cannot be empty")
    .max(64, "App ID must be at most 64 characters")
    .optional(),
  role: z.enum(["seller", "member"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  whatsapp_number: z
    .string()
    .trim()
    .min(8, "WhatsApp number must be at least 8 digits")
    .max(25, "WhatsApp number must be at most 25 characters")
    .optional(),
});

export const grantAppRoleSchema = z.object({
  app_id: z
    .string()
    .trim()
    .min(1, "App ID is required")
    .max(64, "App ID must be at most 64 characters"),
  role: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(64, "Role name must be at most 64 characters"),
  user_id: z.string().trim().min(1).max(128).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type GrantAppRoleInput = z.infer<typeof grantAppRoleSchema>;
