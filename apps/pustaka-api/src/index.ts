import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, notFoundHandler } from "./errors/handler";
import { dbMiddleware } from "./middlewares/db";
import { authRoutes } from "./routes/auth";
import { booksRoutes } from "./routes/books";
import { bookshelvesRoutes } from "./routes/bookshelves";
import { meRoutes } from "./routes/me";
import { usersRoutes } from "./routes/users";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("/api/*", dbMiddleware);

app.onError(errorHandler);
app.notFound(notFoundHandler);

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

// Reading Lists & Reading Progress (/api/v1/me)
app.route("/api/v1/me", meRoutes);

export default app;
