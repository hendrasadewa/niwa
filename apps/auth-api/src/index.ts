import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, notFoundHandler } from "./errors/handler";
import { dbMiddleware } from "./middlewares/db";
import { aclRoutes } from "./routes/acl";
import { authRoutes } from "./routes/auth";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("/api/*", dbMiddleware);

app.onError(errorHandler);
app.notFound(notFoundHandler);

app.get("/", (c) =>
  c.json({
    service: "niwa-auth-api",
    status: "ok",
  })
);

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/acl", aclRoutes);

export default app;
