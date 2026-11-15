import { zValidator } from "@hono/zod-validator";
import { createBookshelfSchema } from "@niwa/pustaka-validators";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { bookshelves, createDb } from "../db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import type { AppEnv } from "../types";

export const bookshelvesRoutes = new Hono<AppEnv>();

// GET /api/v1/bookshelves - List all bookshelves (Member & Admin)
bookshelvesRoutes.get("/", authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const items = await db.select().from(bookshelves);
  return c.json({ bookshelves: items });
});

// GET /api/v1/bookshelves/:id - Get a single bookshelf by ID
bookshelvesRoutes.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const [shelf] = await db
    .select()
    .from(bookshelves)
    .where(eq(bookshelves.id, id))
    .limit(1);

  if (!shelf) {
    return c.json({ error: "NotFound", message: "Bookshelf not found" }, 404);
  }

  return c.json({ bookshelf: shelf });
});

// POST /api/v1/bookshelves - Create a new bookshelf (Admin only)
bookshelvesRoutes.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  zValidator("json", createBookshelfSchema),
  async (c) => {
    const { name, location } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const newShelf = {
      id: crypto.randomUUID(),
      name,
      location,
    };

    await db.insert(bookshelves).values(newShelf);

    return c.json({ bookshelf: newShelf }, 201);
  }
);
