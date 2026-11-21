import { Hono, type Context } from "hono";
import { authMiddleware, optionalAuthMiddleware } from "../../middlewares/auth";
import { createMediaStorageRepo } from "../../repositories/media-storage";
import { createOrderRepo } from "../../repositories/orders";
import { createStoreRepo } from "../../repositories/stores";
import { createWaveRepo } from "../../repositories/waves";
import { createOrderService } from "../../services/orders";
import type { AppEnv } from "../../types/env";
import { toImageResponse } from "../../utils/media";
import { validate } from "../../validators";
import { extractUploadedImage } from "../../validators/media";
import { idParamSchema } from "../../validators/orders";

function getOrderService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createOrderService({
    orderRepo: createOrderRepo(db),
    waveRepo: createWaveRepo(db),
    storeRepo: createStoreRepo(db),
    mediaStorageRepo: createMediaStorageRepo(c.env.BUCKET),
  });
}

export const orderReceiptsRoutes = new Hono<AppEnv>();

// PUT /api/v1/orders/:id/receipt
orderReceiptsRoutes.put(
  "/:id/receipt",
  optionalAuthMiddleware,
  validate("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const image = await extractUploadedImage(c, ["receipt", "file", "image"]);
    const result = await getOrderService(c).uploadReceipt({
      user: c.get("user"),
      idOrSlug: id,
      image,
    });
    return c.json(result);
  }
);

// GET /api/v1/orders/:id/receipt
orderReceiptsRoutes.get(
  "/:id/receipt",
  authMiddleware,
  validate("param", idParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const object = await getOrderService(c).getReceipt(user, id);
    return toImageResponse(object);
  }
);
