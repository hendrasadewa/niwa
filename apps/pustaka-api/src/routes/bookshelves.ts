import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { createBookshelfRepo } from "../repositories/bookshelves";
import { createBookshelfService } from "../services/bookshelves";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import { createBookshelfSchema } from "../validators/bookshelves";

function getBookshelfService(c: Context<AppEnv>) {
  return createBookshelfService({
    bookshelfRepo: createBookshelfRepo(c.get("db")),
  });
}

export const bookshelvesRoutes = new Hono<AppEnv>();

// GET /api/v1/bookshelves
bookshelvesRoutes.get("/", authMiddleware, async (c) => {
  const bookshelves = await getBookshelfService(c).listBookshelves();
  return c.json({ bookshelves });
});

// GET /api/v1/bookshelves/:id
bookshelvesRoutes.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const bookshelf = await getBookshelfService(c).getBookshelf(id);
  return c.json({ bookshelf });
});

// POST /api/v1/bookshelves
bookshelvesRoutes.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  validate("json", createBookshelfSchema),
  async (c) => {
    const body = c.req.valid("json");
    const bookshelf = await getBookshelfService(c).createBookshelf(body);
    return c.json({ bookshelf }, 201);
  }
);
