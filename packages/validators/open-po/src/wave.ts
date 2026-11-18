import { z } from "zod";

export const WAVE_STATUSES = ["Draft", "Active", "Closed"] as const;
export const waveStatusEnum = z.enum(WAVE_STATUSES);
export type WaveStatus = z.infer<typeof waveStatusEnum>;

export const createWaveSchema = z
  .object({
    store_id: z.string().trim().min(1, "Store ID is required"),
    name: z
      .string()
      .trim()
      .min(1, "Wave name is required")
      .max(200, "Wave name must be at most 200 characters"),
    start_date: z
      .number()
      .int("Start date must be a Unix epoch integer timestamp"),
    end_date: z.number().int("End date must be a Unix epoch integer timestamp"),
    status: waveStatusEnum.optional().default("Draft"),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "end_date must be greater than or equal to start_date",
    path: ["end_date"],
  });

export const updateWaveSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Wave name is required")
    .max(200, "Wave name must be at most 200 characters")
    .optional(),
  start_date: z.number().int().optional(),
  end_date: z.number().int().optional(),
});

export const updateWaveStatusSchema = z.object({
  status: waveStatusEnum,
});

export const upsertWaveProductSchema = z.object({
  product_id: z.string().trim().min(1, "Product ID is required"),
  locked_price: z
    .number()
    .int("Locked price must be an integer")
    .nonnegative("Locked price cannot be negative")
    .optional(),
  quota: z
    .number()
    .int("Quota must be an integer")
    .positive("Quota must be greater than 0")
    .nullable()
    .optional(),
});

export const waveQuerySchema = z.object({
  store_id: z.string().trim().optional(),
  status: waveStatusEnum.optional(),
});

export const waveProductParamSchema = z.object({
  id: z.string().trim().min(1, "Wave ID is required"),
  wave_product_id: z.string().trim().min(1, "WaveProduct ID is required"),
});

export type CreateWaveInput = z.infer<typeof createWaveSchema>;
export type UpdateWaveInput = z.infer<typeof updateWaveSchema>;
export type UpdateWaveStatusInput = z.infer<typeof updateWaveStatusSchema>;
export type UpsertWaveProductInput = z.infer<typeof upsertWaveProductSchema>;
export type WaveQueryInput = z.infer<typeof waveQuerySchema>;
