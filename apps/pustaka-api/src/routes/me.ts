import { zValidator } from "@hono/zod-validator";
import {
  addReadingListSchema,
  bookIdRouteParamSchema,
  updateReadingListStatusSchema,
  updateReadingProgressSchema,
} from "@niwa/pustaka-validators";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { books, createDb, readingLists, readingProgress } from "../db";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppEnv } from "../types";

export const meRoutes = new Hono<AppEnv>();

meRoutes.use("*", authMiddleware, requirePermission("reading:manage"));

// GET /api/v1/me/reading-list - Get current user's reading list
meRoutes.get("/reading-list", async (c) => {
  const user = c.get("user");
  const db = createDb(c.env.DB);

  const items = await db
    .select({
      id: readingLists.id,
      user_id: readingLists.user_id,
      book_id: readingLists.book_id,
      status: readingLists.status,
      updated_at: readingLists.updated_at,
      book: {
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        total_pages: books.total_pages,
        cover_image_key: books.cover_image_key,
        bookshelf_id: books.bookshelf_id,
      },
    })
    .from(readingLists)
    .innerJoin(books, eq(readingLists.book_id, books.id))
    .where(eq(readingLists.user_id, user.id));

  return c.json({ reading_list: items });
});

// POST /api/v1/me/reading-list - Add a book to current user's reading list
meRoutes.post(
  "/reading-list",
  zValidator("json", addReadingListSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id, status } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.id, book_id))
      .limit(1);

    if (!book) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    const [existingEntry] = await db
      .select()
      .from(readingLists)
      .where(
        and(
          eq(readingLists.user_id, user.id),
          eq(readingLists.book_id, book_id)
        )
      )
      .limit(1);

    if (existingEntry) {
      return c.json(
        {
          error: "Conflict",
          message: "Book is already in your reading list",
        },
        409
      );
    }

    const newItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      book_id,
      status,
      updated_at: Math.floor(Date.now() / 1000),
    };

    await db.insert(readingLists).values(newItem);

    return c.json({ reading_list_item: newItem }, 201);
  }
);

// PATCH /api/v1/me/reading-list/:book_id - Update reading list status
meRoutes.patch(
  "/reading-list/:book_id",
  zValidator("param", bookIdRouteParamSchema),
  zValidator("json", updateReadingListStatusSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [existingEntry] = await db
      .select()
      .from(readingLists)
      .where(
        and(
          eq(readingLists.user_id, user.id),
          eq(readingLists.book_id, book_id)
        )
      )
      .limit(1);

    if (!existingEntry) {
      return c.json(
        {
          error: "NotFound",
          message: "Book not found in your reading list",
        },
        404
      );
    }

    const updatedAt = Math.floor(Date.now() / 1000);

    await db
      .update(readingLists)
      .set({ status, updated_at: updatedAt })
      .where(eq(readingLists.id, existingEntry.id));

    return c.json({
      reading_list_item: {
        ...existingEntry,
        status,
        updated_at: updatedAt,
      },
    });
  }
);

// GET /api/v1/me/progress/:book_id - Get reading progress for a book
meRoutes.get(
  "/progress/:book_id",
  zValidator("param", bookIdRouteParamSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id } = c.req.valid("param");
    const db = createDb(c.env.DB);

    const [book] = await db
      .select({
        id: books.id,
        title: books.title,
        total_pages: books.total_pages,
      })
      .from(books)
      .where(eq(books.id, book_id))
      .limit(1);

    if (!book) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    const [progressRecord] = await db
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.user_id, user.id),
          eq(readingProgress.book_id, book_id)
        )
      )
      .limit(1);

    const lastPageRead = progressRecord?.last_page_read ?? 0;
    const percentage =
      book.total_pages > 0
        ? Math.round((lastPageRead / book.total_pages) * 100)
        : 0;

    return c.json({
      progress: {
        id: progressRecord?.id ?? null,
        user_id: user.id,
        book_id,
        last_page_read: lastPageRead,
        total_pages: book.total_pages,
        percentage,
        updated_at: progressRecord?.updated_at ?? null,
      },
    });
  }
);

// PUT /api/v1/me/progress/:book_id - Update last_page_read with total_pages constraint
meRoutes.put(
  "/progress/:book_id",
  zValidator("param", bookIdRouteParamSchema),
  zValidator("json", updateReadingProgressSchema),
  async (c) => {
    const user = c.get("user");
    const { book_id } = c.req.valid("param");
    const { last_page_read } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const [book] = await db
      .select({
        id: books.id,
        title: books.title,
        total_pages: books.total_pages,
      })
      .from(books)
      .where(eq(books.id, book_id))
      .limit(1);

    if (!book) {
      return c.json({ error: "NotFound", message: "Book not found" }, 404);
    }

    if (last_page_read > book.total_pages) {
      return c.json(
        {
          error: "BadRequest",
          message: `last_page_read (${last_page_read}) cannot exceed book total_pages (${book.total_pages})`,
        },
        400
      );
    }

    const [existingProgress] = await db
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.user_id, user.id),
          eq(readingProgress.book_id, book_id)
        )
      )
      .limit(1);

    const updatedAt = Math.floor(Date.now() / 1000);
    let progressId: string;

    if (existingProgress) {
      progressId = existingProgress.id;
      await db
        .update(readingProgress)
        .set({
          last_page_read,
          updated_at: updatedAt,
        })
        .where(eq(readingProgress.id, existingProgress.id));
    } else {
      progressId = crypto.randomUUID();
      await db.insert(readingProgress).values({
        id: progressId,
        user_id: user.id,
        book_id,
        last_page_read,
        updated_at: updatedAt,
      });
    }

    const percentage =
      book.total_pages > 0
        ? Math.round((last_page_read / book.total_pages) * 100)
        : 0;

    return c.json({
      progress: {
        id: progressId,
        user_id: user.id,
        book_id,
        last_page_read,
        total_pages: book.total_pages,
        percentage,
        updated_at: updatedAt,
      },
    });
  }
);
