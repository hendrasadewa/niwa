import { Hono, type Context } from "hono";
import { optionalAuthMiddleware } from "../middlewares/auth";
import { createOrderRepo } from "../repositories/orders";
import { createStoreRepo } from "../repositories/stores";
import { createWaveRepo } from "../repositories/waves";
import { createTrackingService } from "../services/tracking";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import { guestOrderLookupQuerySchema, idParamSchema } from "../validators/orders";

function getTrackingService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createTrackingService({
    orderRepo: createOrderRepo(db),
    waveRepo: createWaveRepo(db),
    storeRepo: createStoreRepo(db),
  });
}

export const trackRoutes = new Hono<AppEnv>();

// GET /api/v1/track?phone=... (or ?whatsapp=...)
trackRoutes.get(
  "/",
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

// GET /api/v1/track/lookup?phone=... (or ?whatsapp=...)
trackRoutes.get(
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

// GET /api/v1/track/:id
trackRoutes.get(
  "/:id",
  optionalAuthMiddleware,
  validate("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const tracking = await getTrackingService(c).getTrackingTimeline(
      id,
      c.get("user")
    );
    return c.json({ tracking });
  }
);

// PATCH /api/v1/track/:id/confirm-received
trackRoutes.patch(
  "/:id/confirm-received",
  optionalAuthMiddleware,
  validate("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const order = await getTrackingService(c).confirmReceived(
      id,
      c.get("user")
    );
    return c.json({ order });
  }
);
