import { Hono, type Context } from "hono";
import { createBookRepo } from "../../repositories/books";
import { createBookshelfRepo } from "../../repositories/bookshelves";
import { createCoverStorageRepo } from "../../repositories/cover-storage";
import { createLibraryRepo } from "../../repositories/libraries";
import { createLibraryMemberRepo } from "../../repositories/library-members";
import { createBookService } from "../../services/books";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import { bookQuerySchema } from "../../validators/books";

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

export const meBooksRoutes = new Hono<AppEnv>();

// GET /api/v1/me/books
meBooksRoutes.get("/", validate("query", bookQuerySchema), async (c) => {
  const user = c.get("user");
  const query = c.req.valid("query");
  const books = await getBookService(c).listOwnedByMe(user, {
    search: query.search,
    library_id: query.library_id,
  });
  return c.json({ books });
});
