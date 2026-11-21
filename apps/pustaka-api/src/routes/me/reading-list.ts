import { Hono, type Context } from "hono";
import { createBookRepo } from "../../repositories/books";
import { createReadingListRepo } from "../../repositories/reading-lists";
import { createReadingListService } from "../../services/reading-list";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  addReadingListSchema,
  bookIdRouteParamSchema,
  updateReadingListStatusSchema,
} from "../../validators/me";

function getReadingListService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createReadingListService({
    bookRepo: createBookRepo(db),
    readingListRepo: createReadingListRepo(db),
  });
}

export const meReadingListRoutes = new Hono<AppEnv>();

// GET /api/v1/me/reading-list
meReadingListRoutes.get("/", async (c) => {
  const user = c.get("user");
  const reading_list = await getReadingListService(c).listForUser(user.id);
  return c.json({ reading_list });
});

// POST /api/v1/me/reading-list
meReadingListRoutes.post(
  "/",
  validate("json", addReadingListSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id, status } = c.req.valid("json");
    const reading_list_item = await getReadingListService(c).addBook({
      userId: user.id,
      bookId: book_id,
      status,
    });
    return c.json({ reading_list_item }, 201);
  }
);

// PATCH /api/v1/me/reading-list/:book_id
meReadingListRoutes.patch(
  "/:book_id",
  validate("param", bookIdRouteParamSchema),
  validate("json", updateReadingListStatusSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const reading_list_item = await getReadingListService(c).updateStatus({
      userId: user.id,
      bookId: book_id,
      status,
    });
    return c.json({ reading_list_item });
  }
);
