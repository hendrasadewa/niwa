import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { booksRoutes } from "./routes/books";
import { bookshelvesRoutes } from "./routes/bookshelves";
import { usersRoutes } from "./routes/users";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use("*", cors());

app.get("/", (c) =>
  c.json({
    service: "pustaka-api",
    status: "ok",
  })
);

// Auth & Users (/api/v1/auth, /api/v1/users, and /api/v1 root aliases)
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/users", usersRoutes);
app.route("/api/v1", authRoutes);

// Inventory & Cloudflare R2 Media (/api/v1/bookshelves, /api/v1/books)
app.route("/api/v1/bookshelves", bookshelvesRoutes);
app.route("/api/v1/books", booksRoutes);

export default app;
