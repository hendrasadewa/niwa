import { Hono, type Context } from "hono";
import {
  authMiddleware,
  getOptionalUser,
  optionalAuthMiddleware,
} from "../middlewares/auth";
import { createBookshelfRepo } from "../repositories/bookshelves";
import { createLibraryRepo } from "../repositories/libraries";
import { createLibraryMemberRepo } from "../repositories/library-members";
import { createBookshelfService } from "../services/bookshelves";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import {
  bookshelfIdParamSchema,
  bookshelfQuerySchema,
  createBookshelfWithLibrarySchema,
  updateBookshelfSchema,
} from "../validators/bookshelves";

function getBookshelfService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createBookshelfService({
    bookshelfRepo: createBookshelfRepo(db),
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
  });
}

export const bookshelvesRoutes = new Hono<AppEnv>();

// GET /api/v1/bookshelves
bookshelvesRoutes.get(
  "/",
  optionalAuthMiddleware,
  validate("query", bookshelfQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const bookshelves = await getBookshelfService(c).listBookshelves(
      getOptionalUser(c),
      { libraryId: query.library_id }
    );
    return c.json({ bookshelves });
  }
);

// GET /api/v1/bookshelves/:id
bookshelvesRoutes.get(
  "/:id",
  optionalAuthMiddleware,
  validate("param", bookshelfIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const bookshelf = await getBookshelfService(c).getBookshelf(
      id,
      getOptionalUser(c)
    );
    return c.json({ bookshelf });
  }
);

// POST /api/v1/bookshelves
bookshelvesRoutes.post(
  "/",
  authMiddleware,
  validate("json", createBookshelfWithLibrarySchema),
  async (c) => {
    const { library_id, ...body } = c.req.valid("json");
    const bookshelf = await getBookshelfService(c).createBookshelf(
      library_id,
      body,
      c.get("user")
    );
    return c.json({ bookshelf }, 201);
  }
);

// PUT /api/v1/bookshelves/:id
bookshelvesRoutes.put(
  "/:id",
  authMiddleware,
  validate("param", bookshelfIdParamSchema),
  validate("json", updateBookshelfSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const bookshelf = await getBookshelfService(c).updateBookshelf(
      id,
      updates,
      c.get("user")
    );
    return c.json({ bookshelf });
  }
);

// DELETE /api/v1/bookshelves/:id
bookshelvesRoutes.delete(
  "/:id",
  authMiddleware,
  validate("param", bookshelfIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await getBookshelfService(c).deleteBookshelf(
      id,
      c.get("user")
    );
    return c.json({
      message: "Bookshelf deleted successfully",
      id: result.id,
    });
  }
);
