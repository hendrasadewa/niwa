import { Hono, type Context } from "hono";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/rbac";
import { createBookRepo } from "../../repositories/books";
import { createBookshelfRepo } from "../../repositories/bookshelves";
import { createCoverStorageRepo } from "../../repositories/cover-storage";
import { createBookService } from "../../services/books";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  bookIdParamSchema,
  bookQuerySchema,
  createBookSchema,
  updateBookLocationSchema,
  updateBookSchema,
} from "../../validators/books";

function getBookService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createBookService({
    bookRepo: createBookRepo(db),
    bookshelfRepo: createBookshelfRepo(db),
    coverStorageRepo: createCoverStorageRepo(c.env.BUCKET),
  });
}

export const booksCoreRoutes = new Hono<AppEnv>();

// GET /api/v1/books
booksCoreRoutes.get(
  "/",
  authMiddleware,
  validate("query", bookQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const books = await getBookService(c).listBooks(query);
    return c.json({ books });
  }
);

// GET /api/v1/books/:id
booksCoreRoutes.get(
  "/:id",
  authMiddleware,
  validate("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const book = await getBookService(c).getBook(id);
    return c.json({ book });
  }
);

// POST /api/v1/books
booksCoreRoutes.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  validate("json", createBookSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const book = await getBookService(c).createBook(payload);
    return c.json({ book }, 201);
  }
);

// PUT /api/v1/books/:id
booksCoreRoutes.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  validate("param", bookIdParamSchema),
  validate("json", updateBookSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const book = await getBookService(c).updateBook(id, updates);
    return c.json({ book });
  }
);

// PATCH /api/v1/books/:id/location
booksCoreRoutes.patch(
  "/:id/location",
  authMiddleware,
  requireRole("admin"),
  validate("param", bookIdParamSchema),
  validate("json", updateBookLocationSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { bookshelf_id } = c.req.valid("json");
    const book = await getBookService(c).moveBook(id, bookshelf_id);
    return c.json({ book });
  }
);

// DELETE /api/v1/books/:id
booksCoreRoutes.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  validate("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await getBookService(c).deleteBook(id);
    return c.json({
      message: "Book deleted successfully",
      id: result.id,
    });
  }
);
