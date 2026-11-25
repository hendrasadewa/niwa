import { BlogErrors } from "../errors/blog";
import { AtprotoXrpcError, type AtprotoPdsRepo } from "../repositories/atproto-pds";
import type { MediaStorageRepo } from "../repositories/media-storage";

const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB on R2
export const MAX_PDS_COVER_IMAGE_BYTES = 976 * 1024; // ~976 KB safety margin under 1MB ATProto blob cap

export interface MediaServiceDeps {
  mediaStorageRepo: MediaStorageRepo;
  atprotoPdsRepo: AtprotoPdsRepo;
  apiPublicUrl: string;
}

export function buildMediaPublicUrl(apiPublicUrl: string, key: string): string {
  const base = apiPublicUrl.replace(/\/+$/, "");
  return `${base}/api/v1/public/media/${key}`;
}

export function buildBlobPublicUrl(apiPublicUrl: string, cid: string): string {
  const base = apiPublicUrl.replace(/\/+$/, "");
  return `${base}/api/v1/public/blobs/${encodeURIComponent(cid)}`;
}

export function createMediaService({
  mediaStorageRepo,
  atprotoPdsRepo,
  apiPublicUrl,
}: MediaServiceDeps) {
  function validateImage(
    mimeType: string,
    fileBuffer: ArrayBuffer,
    purpose: "inline" | "cover"
  ): { normalizedMime: string; extension: string } {
    const normalizedMime = mimeType.toLowerCase();
    const extension = ALLOWED_IMAGE_MIME_TYPES[normalizedMime];
    if (!extension) {
      throw BlogErrors.mediaUnsupportedMimeType(
        normalizedMime,
        Object.keys(ALLOWED_IMAGE_MIME_TYPES)
      );
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      throw BlogErrors.mediaEmpty();
    }

    const maxBytes =
      purpose === "cover" ? MAX_PDS_COVER_IMAGE_BYTES : MAX_INLINE_IMAGE_BYTES;
    if (fileBuffer.byteLength > maxBytes) {
      throw BlogErrors.mediaTooLarge(maxBytes, purpose);
    }

    return { normalizedMime, extension };
  }

  return {
    async uploadInlineImage(input: {
      mimeType: string;
      fileBuffer: ArrayBuffer;
    }): Promise<{ key: string; url: string; size: number; mimeType: string }> {
      const { normalizedMime, extension } = validateImage(
        input.mimeType,
        input.fileBuffer,
        "inline"
      );

      const key = `media/${crypto.randomUUID()}.${extension}`;
      await mediaStorageRepo.putObject(key, input.fileBuffer, normalizedMime);

      return {
        key,
        url: buildMediaPublicUrl(apiPublicUrl, key),
        size: input.fileBuffer.byteLength,
        mimeType: normalizedMime,
      };
    },

    async uploadStagingCover(input: {
      mimeType: string;
      fileBuffer: ArrayBuffer;
    }): Promise<{ key: string; url: string; size: number; mimeType: string }> {
      const { normalizedMime, extension } = validateImage(
        input.mimeType,
        input.fileBuffer,
        "cover"
      );

      const key = `staging-covers/${crypto.randomUUID()}.${extension}`;
      await mediaStorageRepo.putObject(key, input.fileBuffer, normalizedMime);

      return {
        key,
        url: buildMediaPublicUrl(apiPublicUrl, key),
        size: input.fileBuffer.byteLength,
        mimeType: normalizedMime,
      };
    },

    async getPublicMedia(key: string): Promise<{
      body: ReadableStream;
      contentType: string;
      etag: string;
    }> {
      // Never expose internal cache files through public media endpoint
      if (!key || key.startsWith("_cache/") || key.includes("..")) {
        throw BlogErrors.mediaNotFound();
      }
      if (!key.startsWith("media/") && !key.startsWith("staging-covers/")) {
        throw BlogErrors.mediaNotFound();
      }

      const obj = await mediaStorageRepo.getObject(key);
      if (!obj) {
        throw BlogErrors.mediaNotFound();
      }

      return {
        body: obj.body,
        contentType:
          obj.httpMetadata?.contentType || "application/octet-stream",
        etag: obj.httpEtag,
      };
    },

    async getPublicBlob(cid: string): Promise<{
      body: ReadableStream<Uint8Array>;
      contentType: string;
    }> {
      if (!cid || cid.includes("/") || cid.includes("..")) {
        throw BlogErrors.mediaNotFound();
      }

      try {
        const blob = await atprotoPdsRepo.getBlob(cid);
        if (!blob || !blob.body) {
          throw BlogErrors.mediaNotFound();
        }
        return {
          body: blob.body,
          contentType: blob.contentType,
        };
      } catch (err) {
        if (err instanceof AtprotoXrpcError) {
          throw BlogErrors.atprotoUpstreamError("getBlob", err.message);
        }
        throw err;
      }
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
