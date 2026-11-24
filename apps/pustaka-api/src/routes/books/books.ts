import { Hono, type Context } from "hono";
import {
  authMiddleware,
  getOptionalUser,
  optionalAuthMiddleware,
} from "../../middlewares/auth";
import { createBookRepo } from "../../repositories/books";
import { createBookshelfRepo } from "../../repositories/bookshelves";
import { createCoverStorageRepo } from "../../repositories/cover-storage";
import { createLibraryRepo } from "../../repositories/libraries";
import { createLibraryMemberRepo } from "../../repositories/library-members";
import { createBookService } from "../../services/books";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  bookIdParamSchema,
  bookQuerySchema,
  createBookWithLibrarySchema,
  updateBookLocationSchema,
  updateBookSchema,
} from "../../validators/books";

function getBookService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createBookService({
    bookRepo: createBookRepo(db),
    bookshelfRepo: createBookshelfRepo(db),
    coverStorageRepo: createCoverStorageRepo(c.env.BUCKET),
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
  });
}

export const booksCoreRoutes = new Hono<AppEnv>();

// GET /api/v1/books (visibility-scoped catalog read)
booksCoreRoutes.get(
  "/",
  optionalAuthMiddleware,
  validate("query", bookQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const books = await getBookService(c).listBooks(getOptionalUser(c), query);
    return c.json({ books });
  }
);

// GET /api/v1/books/:id (visibility-scoped book detail read)
booksCoreRoutes.get(
  "/:id",
  optionalAuthMiddleware,
  validate("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const book = await getBookService(c).getBook(id, getOptionalUser(c));
    return c.json({ book });
  }
);

// POST /api/v1/books
booksCoreRoutes.post(
  "/",
  authMiddleware,
  validate("json", createBookWithLibrarySchema),
  async (c) => {
    const { library_id, ...payload } = c.req.valid("json");
    const book = await getBookService(c).createBook(
      library_id,
      payload,
      c.get("user")
    );
    return c.json({ book }, 201);
  }
);

// PUT /api/v1/books/:id
booksCoreRoutes.put(
  "/:id",
  authMiddleware,
  validate("param", bookIdParamSchema),
  validate("json", updateBookSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const book = await getBookService(c).updateBook(id, updates, c.get("user"));
    return c.json({ book });
  }
);

// PATCH /api/v1/books/:id/location
booksCoreRoutes.patch(
  "/:id/location",
  authMiddleware,
  validate("param", bookIdParamSchema),
  validate("json", updateBookLocationSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { bookshelf_id } = c.req.valid("json");
    const book = await getBookService(c).moveBook(
      id,
      bookshelf_id,
      c.get("user")
    );
    return c.json({ book });
  }
);

// DELETE /api/v1/books/:id
booksCoreRoutes.delete(
  "/:id",
  authMiddleware,
  validate("param", bookIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await getBookService(c).deleteBook(id, c.get("user"));
    return c.json({
      message: "Book deleted successfully",
      id: result.id,
    });
  }
);
