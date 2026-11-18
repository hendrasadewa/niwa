import type { Context } from "hono";
import type { AppEnv } from "../types";

export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type R2UploadResult =
  | {
      ok: true;
      objectKey: string;
      mimeType: string;
      sizeBytes: number;
    }
  | {
      ok: false;
      status: 400;
      error: "BadRequest";
      message: string;
    };

/**
 * Extracts an image file from multipart/form-data (`file`, `image`, `logo`, `receipt`) or raw binary body,
 * validates MIME type and size, uploads to Cloudflare R2, and cleans up any previous object key.
 */
export async function uploadImageToR2(
  c: Context<AppEnv>,
  options: {
    prefix: string;
    entityId: string;
    previousKey?: string | null;
    fieldNames?: string[];
  }
): Promise<R2UploadResult> {
  const contentTypeHeader = c.req.header("content-type") ?? "";
  let fileBuffer: ArrayBuffer | null = null;
  let mimeType = "";

  const candidateFields = options.fieldNames ?? [
    "file",
    "image",
    "logo",
    "receipt",
  ];

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
      return {
        ok: false,
        status: 400,
        error: "BadRequest",
        message: `Multipart form must include a file field (${candidateFields.join(", ")})`,
      };
    }

    mimeType = uploaded.type.toLowerCase();
    fileBuffer = await uploaded.arrayBuffer();
  } else {
    const baseContentType =
      contentTypeHeader.split(";")[0]?.trim().toLowerCase() ?? "";
    mimeType = baseContentType;
    fileBuffer = await c.req.arrayBuffer();
  }

  const extension = ALLOWED_IMAGE_MIME_TYPES[mimeType];
  if (!extension) {
    return {
      ok: false,
      status: 400,
      error: "BadRequest",
      message: `Unsupported image MIME type '${mimeType || "unknown"}'. Allowed: ${Object.keys(ALLOWED_IMAGE_MIME_TYPES).join(", ")}`,
    };
  }

  if (!fileBuffer || fileBuffer.byteLength === 0) {
    return {
      ok: false,
      status: 400,
      error: "BadRequest",
      message: "Uploaded image is empty",
    };
  }

  if (fileBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      status: 400,
      error: "BadRequest",
      message: "Uploaded image exceeds maximum size of 10MB",
    };
  }

  const objectKey = `${options.prefix}/${options.entityId}/${crypto.randomUUID()}.${extension}`;

  await c.env.BUCKET.put(objectKey, fileBuffer, {
    httpMetadata: {
      contentType: mimeType,
    },
  });

  if (options.previousKey && options.previousKey !== objectKey) {
    await c.env.BUCKET.delete(options.previousKey);
  }

  return {
    ok: true,
    objectKey,
    mimeType,
    sizeBytes: fileBuffer.byteLength,
  };
}

/**
 * Fetches an object from Cloudflare R2 and returns a streaming HTTP Response.
 */
export async function streamImageFromR2(
  bucket: R2Bucket,
  objectKey: string
): Promise<Response | null> {
  const object = await bucket.get(objectKey);
  if (!object) {
    return null;
  }

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
