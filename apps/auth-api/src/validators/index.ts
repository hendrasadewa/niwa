import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { $ZodType } from "zod/v4/core";
import { CommonErrors } from "../errors/common";

export function validate<
  Target extends keyof ValidationTargets,
  Schema extends $ZodType,
>(target: Target, schema: Schema) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      }));
      throw CommonErrors.validation(details, "Invalid request payload");
    }
  });
}
