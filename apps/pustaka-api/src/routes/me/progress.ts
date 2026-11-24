import { Hono, type Context } from "hono";
import { createBookRepo } from "../../repositories/books";
import { createLibraryRepo } from "../../repositories/libraries";
import { createLibraryMemberRepo } from "../../repositories/library-members";
import { createReadingProgressRepo } from "../../repositories/reading-progress";
import { createReadingProgressService } from "../../services/reading-progress";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  bookIdRouteParamSchema,
  updateReadingProgressSchema,
} from "../../validators/me";

function getReadingProgressService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createReadingProgressService({
    bookRepo: createBookRepo(db),
    readingProgressRepo: createReadingProgressRepo(db),
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
  });
}

export const meProgressRoutes = new Hono<AppEnv>();

// GET /api/v1/me/progress/:book_id
meProgressRoutes.get(
  "/:book_id",
  validate("param", bookIdRouteParamSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id } = c.req.valid("param");
    const progress = await getReadingProgressService(c).getProgress(
      user.id,
      book_id
    );
    return c.json({ progress });
  }
);

// PUT /api/v1/me/progress/:book_id
meProgressRoutes.put(
  "/:book_id",
  validate("param", bookIdRouteParamSchema),
  validate("json", updateReadingProgressSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id } = c.req.valid("param");
    const { last_page_read } = c.req.valid("json");
    const progress = await getReadingProgressService(c).updateProgress({
      userId: user.id,
      bookId: book_id,
      lastPageRead: last_page_read,
    });
    return c.json({ progress });
  }
);
