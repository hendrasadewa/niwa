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
import { createBookshelfService } from "../../services/bookshelves";
import { createLibraryService } from "../../services/libraries";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import { bookQuerySchema, createBookSchema } from "../../validators/books";
import { createBookshelfSchema } from "../../validators/bookshelves";
import {
  createLibrarySchema,
  libraryIdParamSchema,
  libraryQuerySchema,
  transferLibraryOwnershipSchema,
  updateLibrarySchema,
} from "../../validators/libraries";

function getLibraryService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createLibraryService({
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
    bookRepo: createBookRepo(db),
  });
}

function getBookshelfService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createBookshelfService({
    bookshelfRepo: createBookshelfRepo(db),
    libraryRepo: createLibraryRepo(db),
    libraryMemberRepo: createLibraryMemberRepo(db),
  });
}

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

export const librariesCoreRoutes = new Hono<AppEnv>();

// GET /api/v1/libraries
librariesCoreRoutes.get(
  "/",
  optionalAuthMiddleware,
  validate("query", libraryQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const libraries = await getLibraryService(c).listLibraries(
      getOptionalUser(c),
      query
    );
    return c.json({ libraries });
  }
);

// POST /api/v1/libraries
librariesCoreRoutes.post(
  "/",
  authMiddleware,
  validate("json", createLibrarySchema),
  async (c) => {
    const body = c.req.valid("json");
    const library = await getLibraryService(c).createLibrary(
      body,
      c.get("user")
    );
    return c.json({ library }, 201);
  }
);

// GET /api/v1/libraries/:libraryId
librariesCoreRoutes.get(
  "/:libraryId",
  optionalAuthMiddleware,
  validate("param", libraryIdParamSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const library = await getLibraryService(c).getLibrary(
      libraryId,
      getOptionalUser(c)
    );
    return c.json({ library });
  }
);

// PUT /api/v1/libraries/:libraryId
librariesCoreRoutes.put(
  "/:libraryId",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  validate("json", updateLibrarySchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const updates = c.req.valid("json");
    const library = await getLibraryService(c).updateLibrary(
      libraryId,
      updates,
      c.get("user")
    );
    return c.json({ library });
  }
);

// DELETE /api/v1/libraries/:libraryId
librariesCoreRoutes.delete(
  "/:libraryId",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const result = await getLibraryService(c).deleteLibrary(
      libraryId,
      c.get("user")
    );
    return c.json({
      message: "Library deleted successfully",
      id: result.id,
    });
  }
);

// POST /api/v1/libraries/:libraryId/transfer-ownership
librariesCoreRoutes.post(
  "/:libraryId/transfer-ownership",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  validate("json", transferLibraryOwnershipSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const { new_owner_id } = c.req.valid("json");
    const library = await getLibraryService(c).transferOwnership(
      libraryId,
      new_owner_id,
      c.get("user")
    );
    return c.json({ library });
  }
);

// GET /api/v1/libraries/:libraryId/bookshelves
librariesCoreRoutes.get(
  "/:libraryId/bookshelves",
  optionalAuthMiddleware,
  validate("param", libraryIdParamSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const bookshelves = await getBookshelfService(c).listBookshelves(
      getOptionalUser(c),
      { libraryId }
    );
    return c.json({ bookshelves });
  }
);

// POST /api/v1/libraries/:libraryId/bookshelves
librariesCoreRoutes.post(
  "/:libraryId/bookshelves",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  validate("json", createBookshelfSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const body = c.req.valid("json");
    const bookshelf = await getBookshelfService(c).createBookshelf(
      libraryId,
      body,
      c.get("user")
    );
    return c.json({ bookshelf }, 201);
  }
);

// GET /api/v1/libraries/:libraryId/books
librariesCoreRoutes.get(
  "/:libraryId/books",
  optionalAuthMiddleware,
  validate("param", libraryIdParamSchema),
  validate("query", bookQuerySchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const books = await getBookService(c).listBooks(getOptionalUser(c), {
      ...query,
      library_id: libraryId,
    });
    return c.json({ books });
  }
);

// POST /api/v1/libraries/:libraryId/books
librariesCoreRoutes.post(
  "/:libraryId/books",
  authMiddleware,
  validate("param", libraryIdParamSchema),
  validate("json", createBookSchema),
  async (c) => {
    const { libraryId } = c.req.valid("param");
    const body = c.req.valid("json");
    const book = await getBookService(c).createBook(
      libraryId,
      body,
      c.get("user")
    );
    return c.json({ book }, 201);
  }
);
