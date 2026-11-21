import { z } from "zod";

export const ssoTokenSchema = z.object({
  app_id: z
    .string()
    .trim()
    .min(1, "App ID is required")
    .max(64, "App ID must be at most 64 characters"),
  redirect_uri: z
    .string()
    .trim()
    .max(2048, "Redirect URI is too long")
    .optional(),
});

export const ssoConsentSchema = z.object({
  app_id: z
    .string()
    .trim()
    .min(1, "App ID is required")
    .max(64, "App ID must be at most 64 characters"),
  decision: z.enum(["approve", "deny"]),
  redirect_uri: z
    .string()
    .trim()
    .max(2048, "Redirect URI is too long")
    .optional(),
});

export const sessionIdParamSchema = z.object({
  id: z.string().trim().min(1, "Session ID is required").max(128),
});

export const appIdParamSchema = z.object({
  appId: z.string().trim().min(1, "App ID is required").max(64),
});

export type SsoTokenInput = z.infer<typeof ssoTokenSchema>;
export type SsoConsentInput = z.infer<typeof ssoConsentSchema>;
export type SessionIdParamInput = z.infer<typeof sessionIdParamSchema>;
export type AppIdParamInput = z.infer<typeof appIdParamSchema>;
