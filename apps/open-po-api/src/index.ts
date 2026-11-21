import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, notFoundHandler } from "./errors/handler";
import { dbMiddleware } from "./middlewares/db";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { ordersRoutes } from "./routes/orders";
import { productsRoutes } from "./routes/products";
import { reviewsRoutes } from "./routes/reviews";
import { storesRoutes } from "./routes/stores";
import { trackRoutes } from "./routes/track";
import { wavesRoutes } from "./routes/waves";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("/api/*", dbMiddleware);

app.onError(errorHandler);
app.notFound(notFoundHandler);

app.get("/", (c) =>
  c.json({
    service: "open-po-api",
    status: "ok",
  })
);

// Module 1: Auth & User Profile (/api/v1/auth, /api/v1/me, and /api/v1 root aliases)
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/me", meRoutes);
app.route("/api/v1", authRoutes);

// Module 2: Seller Store Creation, Configuration & R2 Logo (/api/v1/stores)
app.route("/api/v1/stores", storesRoutes);

// Module 3: Master Product Catalog & Pre-Order Waves (/api/v1/products, /api/v1/waves)
app.route("/api/v1/products", productsRoutes);
app.route("/api/v1/waves", wavesRoutes);

// Modules 4 & 5: Storefront Checkout, Order Kanban, R2 Payment Receipts & Public Tracking (/api/v1/orders, /api/v1/track)
app.route("/api/v1/orders", ordersRoutes);
app.route("/api/v1/track", trackRoutes);

// Module 6: Post-Delivery Feedback & Product Reviews (/api/v1/reviews)
app.route("/api/v1/reviews", reviewsRoutes);

export default app;
