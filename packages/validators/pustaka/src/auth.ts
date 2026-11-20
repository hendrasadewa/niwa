import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters"),
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be at most 128 characters"),
    revoke_other_sessions: z.boolean().optional(),
  })
  .refine((data) => data.new_password !== data.current_password, {
    message: "New password must be different from current password",
    path: ["new_password"],
  });

export const refreshTokenSchema = z.object({
  refresh_token: z
    .string()
    .trim()
    .min(1, "Refresh token is required")
    .max(512, "Invalid refresh token"),
});

export const logoutSchema = z.object({
  refresh_token: z.string().trim().min(1).max(512).optional(),
});

export const assignRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
