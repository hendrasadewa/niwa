import { errorHandler, notFoundHandler } from "@niwa/api-core/errors";
import { createOriginCorsMiddleware } from "@niwa/api-core/middlewares";
import { Hono } from "hono";
import { dbMiddleware } from "./middlewares/db";
import { publicRoutes } from "./routes/public";
import { studioRoutes } from "./routes/studio";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use(
  "*",
  createOriginCorsMiddleware<AppEnv>({
    defaultAllowedOrigins: ["https://blog.hendrasadewa.com"],
  })
);
app.use("/api/*", dbMiddleware);

app.onError(errorHandler);
app.notFound(notFoundHandler);

app.get("/", (c) =>
  c.json({
    service: "blog-api",
    status: "ok",
  })
);

app.route("/api/v1/public", publicRoutes);
app.route("/api/v1/studio", studioRoutes);

export default app;
