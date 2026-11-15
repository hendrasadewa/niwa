import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
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

export default app;
