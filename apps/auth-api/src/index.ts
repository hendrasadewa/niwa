import { errorHandler, notFoundHandler } from "@niwa/api-core/errors";
import { Hono } from "hono";
import { strictCorsMiddleware } from "./middlewares/cors";
import { dbMiddleware } from "./middlewares/db";
import { accountRoutes } from "./routes/account";
import { aclRoutes } from "./routes/acl";
import { authRoutes } from "./routes/auth";
import { ssoRoutes } from "./routes/sso";
import { wellKnownRoutes } from "./routes/well-known";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use("*", strictCorsMiddleware);
app.use("/api/*", dbMiddleware);

app.onError(errorHandler);
app.notFound(notFoundHandler);

app.get("/", (c) =>
  c.json({
    service: "niwa-auth-api",
    status: "ok",
  })
);

app.route("/.well-known", wellKnownRoutes);
app.route("/api/v1/sso", ssoRoutes);
app.route("/api/v1/account", accountRoutes);
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/acl", aclRoutes);

export default app;
