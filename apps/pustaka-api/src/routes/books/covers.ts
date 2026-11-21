import { Hono, type Context } from "hono";
import { LibraryErrors } from "../../errors/library";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/rbac";
import { createBookRepo } from "../../repositories/books";
import { createCoverStorageRepo } from "../../repositories/cover-storage";
import { createCoverService } from "../../services/covers";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import { bookIdParamSchema } from "../../validators/books";

function getCoverService(c: Context<AppEnv>) {
  return createCoverService({
    bookRepo: createBookRepo(c.get("db")),
    coverStorageRepo: createCoverStorageRepo(c.env.BUCKET),
  });
}

export const bookCoversRoutes = new Hono<AppEnv>();

// PUT /api/v1/books/:id/cover
bookCoversRoutes.put(
  "/:id/cover",
  authMiddleware,
  requireRole("admin"),
  validate("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const contentTypeHeader = c.req.header("content-type") ?? "";
    let fileBuffer: ArrayBuffer;
    let mimeType: string;

    if (contentTypeHeader.includes("multipart/form-data")) {
      const body = await c.req.parseBody();
      const uploaded = body["cover"] ?? body["file"];
      if (!uploaded || typeof uploaded === "string") {
        throw LibraryErrors.coverMissingFileField();
      }
      mimeType = uploaded.type.toLowerCase();
      fileBuffer = await uploaded.arrayBuffer();
    } else {
      mimeType = contentTypeHeader.split(";")[0]?.trim().toLowerCase() ?? "";
      fileBuffer = await c.req.arrayBuffer();
    }

    const result = await getCoverService(c).uploadCover({
      bookId: id,
      mimeType,
      fileBuffer,
    });

    return c.json(result);
  }
);

// GET /api/v1/books/:id/cover
bookCoversRoutes.get(
  "/:id/cover",
  validate("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const object = await getCoverService(c).getCover(id);

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
);
