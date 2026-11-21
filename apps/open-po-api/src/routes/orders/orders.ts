import { Hono, type Context } from "hono";
import { authMiddleware, optionalAuthMiddleware } from "../../middlewares/auth";
import { createMediaStorageRepo } from "../../repositories/media-storage";
import { createOrderRepo } from "../../repositories/orders";
import { createStoreRepo } from "../../repositories/stores";
import { createWaveRepo } from "../../repositories/waves";
import { createOrderService } from "../../services/orders";
import { createTrackingService } from "../../services/tracking";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  checkoutOrderSchema,
  guestOrderLookupQuerySchema,
  idParamSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
} from "../../validators/orders";

function getOrderService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createOrderService({
    orderRepo: createOrderRepo(db),
    waveRepo: createWaveRepo(db),
    storeRepo: createStoreRepo(db),
    mediaStorageRepo: createMediaStorageRepo(c.env.BUCKET),
  });
}

function getTrackingService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createTrackingService({
    orderRepo: createOrderRepo(db),
    waveRepo: createWaveRepo(db),
    storeRepo: createStoreRepo(db),
  });
}

export const ordersCoreRoutes = new Hono<AppEnv>();

// GET /api/v1/orders/lookup
ordersCoreRoutes.get(
  "/lookup",
  optionalAuthMiddleware,
  validate("query", guestOrderLookupQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await getTrackingService(c).lookupByPhone({
      viewer: c.get("user"),
      ...query,
    });
    return c.json(result);
  }
);

// POST /api/v1/orders/checkout
ordersCoreRoutes.post(
  "/checkout",
  optionalAuthMiddleware,
  validate("json", checkoutOrderSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const result = await getOrderService(c).checkout({
      user: c.get("user"),
      payload,
    });
    return c.json(result, 201);
  }
);

// GET /api/v1/orders
ordersCoreRoutes.get(
  "/",
  authMiddleware,
  validate("query", orderQuerySchema),
  async (c) => {
    const user = c.get("user")!;
    const filters = c.req.valid("query");
    const result = await getOrderService(c).listDashboardOrders({
      user,
      filters,
    });
    return c.json(result);
  }
);

// GET /api/v1/orders/:id
ordersCoreRoutes.get(
  "/:id",
  authMiddleware,
  validate("param", idParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const order = await getOrderService(c).getOrderDetails(user, id);
    return c.json({ order });
  }
);

// PATCH /api/v1/orders/:id/status
ordersCoreRoutes.patch(
  "/:id/status",
  authMiddleware,
  validate("param", idParamSchema),
  validate("json", updateOrderStatusSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const { status, tracking_number } = c.req.valid("json");
    const order = await getOrderService(c).updateOrderStatus({
      user,
      idOrSlug: id,
      status,
      tracking_number,
    });
    return c.json({ order });
  }
);
