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
  default_shipping_address: z
    .string()
    .trim()
    .max(1000, "Shipping address must be at most 1000 characters")
    .nullable()
    .optional(),
  role: z.enum(["seller", "member"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
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
  default_shipping_address: z
    .string()
    .trim()
    .max(1000, "Shipping address must be at most 1000 characters")
    .nullable()
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
