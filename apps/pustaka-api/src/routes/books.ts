import { zValidator } from "@hono/zod-validator";
import {
  bookIdParamSchema,
  bookQuerySchema,
  createBookSchema,
  updateBookLocationSchema,
  updateBookSchema,
} from "@niwa/pustaka-validators";
import { and, eq, like, or, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { books, bookshelves, createDb } from "../db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import type { AppEnv } from "../types";

const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const MAX_COVER_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const booksRoutes = new Hono<AppEnv>();

// GET /api/v1/books - List or search books (Authenticated Member/Admin)
booksRoutes.get(
  "/",
  authMiddleware,
  zValidator("query", bookQuerySchema),
  async (c) => {
    const { search, bookshelf_id } = c.req.valid("query");
    const db = createDb(c.env.DB);

    const conditions: SQL[] = [];

    if (bookshelf_id) {
      conditions.push(eq(books.bookshelf_id, bookshelf_id));
    }

    if (search) {
      const pattern = `%${search}%`;
      const searchCond = or(
        like(books.title, pattern),
        like(books.author, pattern),
        like(books.isbn, pattern)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const query = db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        total_pages: books.total_pages,
        cover_image_key: books.cover_image_key,
        bookshelf_id: books.bookshelf_id,
        bookshelf: {
          id: bookshelves.id,
          name: bookshelves.name,
          location: bookshelves.location,
        },
      })
      .from(books)
      .leftJoin(bookshelves, eq(books.bookshelf_id, bookshelves.id));

    const results =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return c.json({ books: results });
  }
);

// GET /api/v1/books/:id - Get a single book by ID (Authenticated Member/Admin)
booksRoutes.get(
  "/:id",
  authMiddleware,
  zValidator("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [book] = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        total_pages: books.total_pages,
        cover_image_key: books.cover_image_key,
        bookshelf_id: books.bookshelf_id,
        bookshelf: {
          id: bookshelves.id,
          name: bookshelves.name,
          location: bookshelves.location,
        },
      })
      .from(books)
      .leftJoin(bookshelves, eq(books.bookshelf_id, bookshelves.id))
      .where(eq(books.id, id))
      .limit(1);

    if (!book) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    return c.json({ book });
  }
);

// POST /api/v1/books - Add a new book (Admin only)
booksRoutes.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  zValidator("json", createBookSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [shelf] = await db
      .select({ id: bookshelves.id })
      .from(bookshelves)
      .where(eq(bookshelves.id, payload.bookshelf_id))
      .limit(1);

    if (!shelf) {
      return c.json(
        { error: "NotFound", message: "Target bookshelf does not exist" },
        404
      );
    }

    const [existingIsbn] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.isbn, payload.isbn))
      .limit(1);

    if (existingIsbn) {
      return c.json(
        { error: "Conflict", message: "A book with this ISBN already exists" },
        409
      );
    }

    const newBook = {
      id: crypto.randomUUID(),
      title: payload.title,
      author: payload.author,
      isbn: payload.isbn,
      total_pages: payload.total_pages,
      cover_image_key: payload.cover_image_key ?? null,
      bookshelf_id: payload.bookshelf_id,
    };

    await db.insert(books).values(newBook);

    return c.json({ book: newBook }, 201);
  }
);

// PUT /api/v1/books/:id - Update book metadata (Admin only)
booksRoutes.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  zValidator("param", bookIdParamSchema),
  zValidator("json", updateBookSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [existingBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!existingBook) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    if (updates.bookshelf_id) {
      const [shelf] = await db
        .select({ id: bookshelves.id })
        .from(bookshelves)
        .where(eq(bookshelves.id, updates.bookshelf_id))
        .limit(1);

      if (!shelf) {
        return c.json(
          { error: "NotFound", message: "Target bookshelf does not exist" },
          404
        );
      }
    }

    if (updates.isbn && updates.isbn !== existingBook.isbn) {
      const [duplicateIsbn] = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.isbn, updates.isbn))
        .limit(1);

      if (duplicateIsbn) {
        return c.json(
          { error: "Conflict", message: "A book with this ISBN already exists" },
          409
        );
      }
    }

    const updatedRecord = {
      title: updates.title ?? existingBook.title,
      author: updates.author ?? existingBook.author,
      isbn: updates.isbn ?? existingBook.isbn,
      total_pages: updates.total_pages ?? existingBook.total_pages,
      bookshelf_id: updates.bookshelf_id ?? existingBook.bookshelf_id,
    };

    await db.update(books).set(updatedRecord).where(eq(books.id, id));

    return c.json({
      book: {
        ...existingBook,
        ...updatedRecord,
      },
    });
  }
);

// PATCH /api/v1/books/:id/location - Move book to a different bookshelf (Admin only)
booksRoutes.patch(
  "/:id/location",
  authMiddleware,
  requireRole("admin"),
  zValidator("param", bookIdParamSchema),
  zValidator("json", updateBookLocationSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { bookshelf_id } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [existingBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!existingBook) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    const [shelf] = await db
      .select({ id: bookshelves.id })
      .from(bookshelves)
      .where(eq(bookshelves.id, bookshelf_id))
      .limit(1);

    if (!shelf) {
      return c.json(
        { error: "NotFound", message: "Target bookshelf does not exist" },
        404
      );
    }

    await db.update(books).set({ bookshelf_id }).where(eq(books.id, id));

    return c.json({
      book: {
        ...existingBook,
        bookshelf_id,
      },
    });
  }
);

// DELETE /api/v1/books/:id - Delete a book (Admin only)
booksRoutes.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  zValidator("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [existingBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!existingBook) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    if (existingBook.cover_image_key) {
      await c.env.BUCKET.delete(existingBook.cover_image_key);
    }

    await db.delete(books).where(eq(books.id, id));

    return c.json({
      message: "Book deleted successfully",
      id,
    });
  }
);

// PUT /api/v1/books/:id/cover - Upload book cover image to R2 and update D1 (Admin only)
booksRoutes.put(
  "/:id/cover",
  authMiddleware,
  requireRole("admin"),
  zValidator("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [existingBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!existingBook) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    const contentTypeHeader = c.req.header("content-type") ?? "";
    let fileBuffer: ArrayBuffer | null = null;
    let mimeType = "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const body = await c.req.parseBody();
      const uploaded = body["cover"] ?? body["file"];
      if (!uploaded || typeof uploaded === "string") {
        return c.json(
          {
            error: "BadRequest",
            message:
              "Multipart form must include a file field named 'cover' or 'file'",
          },
          400
        );
      }

      mimeType = uploaded.type.toLowerCase();
      fileBuffer = await uploaded.arrayBuffer();
    } else {
      const baseContentType = contentTypeHeader.split(";")[0]?.trim().toLowerCase() ?? "";
      mimeType = baseContentType;
      fileBuffer = await c.req.arrayBuffer();
    }

    const extension = ALLOWED_IMAGE_MIME_TYPES[mimeType];
    if (!extension) {
      return c.json(
        {
          error: "BadRequest",
          message: `Unsupported image MIME type '${mimeType || "unknown"}'. Allowed: ${Object.keys(ALLOWED_IMAGE_MIME_TYPES).join(", ")}`,
        },
        400
      );
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return c.json(
        { error: "BadRequest", message: "Uploaded cover image is empty" },
        400
      );
    }

    if (fileBuffer.byteLength > MAX_COVER_SIZE_BYTES) {
      return c.json(
        {
          error: "BadRequest",
          message: "Cover image exceeds maximum size of 10MB",
        },
        400
      );
    }

    const objectKey = `covers/${id}/${crypto.randomUUID()}.${extension}`;

    await c.env.BUCKET.put(objectKey, fileBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    if (
      existingBook.cover_image_key &&
      existingBook.cover_image_key !== objectKey
    ) {
      await c.env.BUCKET.delete(existingBook.cover_image_key);
    }

    await db
      .update(books)
      .set({ cover_image_key: objectKey })
      .where(eq(books.id, id));

    return c.json({
      book: {
        ...existingBook,
        cover_image_key: objectKey,
      },
      cover_image_key: objectKey,
    });
  }
);

// GET /api/v1/books/:id/cover - Stream or proxy R2 cover image buffer
booksRoutes.get(
  "/:id/cover",
  zValidator("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [book] = await db
      .select({
        id: books.id,
        cover_image_key: books.cover_image_key,
      })
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!book || !book.cover_image_key) {
      return c.json(
        { error: "NotFound", message: "Book cover image not found" },
        404
      );
    }

    const object = await c.env.BUCKET.get(book.cover_image_key);
    if (!object) {
      return c.json(
        { error: "NotFound", message: "Cover object not found in storage" },
        404
      );
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
);
