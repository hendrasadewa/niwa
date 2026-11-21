import type { Context } from "hono";
import { CommerceErrors } from "../errors/commerce";
import type { UploadedImageInput } from "../types/commerce";
import type { AppEnv } from "../types/env";

/**
 * Extracts an uploaded image file from multipart/form-data or raw binary request body.
 */
export async function extractUploadedImage(
  c: Context<AppEnv>,
  candidateFields: string[] = ["file", "image", "logo", "receipt"]
): Promise<UploadedImageInput> {
  const contentTypeHeader = c.req.header("content-type") ?? "";

  if (contentTypeHeader.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    let uploaded: string | File | undefined;
    for (const field of candidateFields) {
      if (body[field]) {
        uploaded = body[field] as string | File;
        break;
      }
    }

    if (!uploaded || typeof uploaded === "string") {
      throw CommerceErrors.mediaMissingField(candidateFields);
    }

    return {
      mimeType: uploaded.type.toLowerCase(),
      fileBuffer: await uploaded.arrayBuffer(),
    };
  }

  return {
    mimeType: contentTypeHeader.split(";")[0]?.trim().toLowerCase() ?? "",
    fileBuffer: await c.req.arrayBuffer(),
  };
}
