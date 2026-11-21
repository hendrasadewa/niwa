import { CommerceErrors } from "../errors/commerce";
import type { UploadedImageInput } from "../types/commerce";

export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageUpload(input: UploadedImageInput): {
  extension: string;
  mimeType: string;
} {
  const mimeType = input.mimeType.toLowerCase();
  const extension = ALLOWED_IMAGE_MIME_TYPES[mimeType];
  if (!extension) {
    throw CommerceErrors.mediaUnsupportedMime(
      mimeType,
      Object.keys(ALLOWED_IMAGE_MIME_TYPES)
    );
  }

  if (!input.fileBuffer || input.fileBuffer.byteLength === 0) {
    throw CommerceErrors.mediaEmpty();
  }

  if (input.fileBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw CommerceErrors.mediaTooLarge();
  }

  return { extension, mimeType };
}

export function toImageResponse(object: R2ObjectBody): Response {
  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ?? "application/octet-stream"
  );
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=3600");

  return new Response(object.body, {
    status: 200,
    headers,
  });
}
