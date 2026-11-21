import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { createOrderRepo } from "../repositories/orders";
import { createProductRepo } from "../repositories/products";
import { createStoreRepo } from "../repositories/stores";
import { createWaveRepo } from "../repositories/waves";
import { createWaveService } from "../services/waves";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import {
  createWaveSchema,
  idParamSchema,
  updateWaveSchema,
  updateWaveStatusSchema,
  upsertWaveProductSchema,
  waveProductParamSchema,
  waveQuerySchema,
} from "../validators/waves";

function getWaveService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createWaveService({
    waveRepo: createWaveRepo(db),
    storeRepo: createStoreRepo(db),
    productRepo: createProductRepo(db),
    orderRepo: createOrderRepo(db),
  });
}

export const wavesRoutes = new Hono<AppEnv>();

// GET /api/v1/waves
wavesRoutes.get("/", validate("query", waveQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const waves = await getWaveService(c).listWaves(query);
  return c.json({ waves });
});

// GET /api/v1/waves/active
wavesRoutes.get("/active", validate("query", waveQuerySchema), async (c) => {
  const { store_id } = c.req.valid("query");
  const waves = await getWaveService(c).listActiveWaves(store_id);
  return c.json({ waves });
});

// GET /api/v1/waves/:id
wavesRoutes.get("/:id", validate("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const wave = await getWaveService(c).getWave(id);
  return c.json({ wave });
});

// POST /api/v1/waves
wavesRoutes.post(
  "/",
  authMiddleware,
  validate("json", createWaveSchema),
  async (c) => {
    const user = c.get("user")!;
    const payload = c.req.valid("json");
    const wave = await getWaveService(c).createWave({ user, payload });
    return c.json({ wave }, 201);
  }
);

// PUT /api/v1/waves/:id
wavesRoutes.put(
  "/:id",
  authMiddleware,
  validate("param", idParamSchema),
  validate("json", updateWaveSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const wave = await getWaveService(c).updateWave({
      user,
      waveId: id,
      updates,
    });
    return c.json({ wave });
  }
);

// PATCH /api/v1/waves/:id/status
wavesRoutes.patch(
  "/:id/status",
  authMiddleware,
  validate("param", idParamSchema),
  validate("json", updateWaveStatusSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const wave = await getWaveService(c).updateStatus({
      user,
      waveId: id,
      status,
    });
    return c.json({ wave });
  }
);

// POST /api/v1/waves/:id/products
wavesRoutes.post(
  "/:id/products",
  authMiddleware,
  validate("param", idParamSchema),
  validate("json", upsertWaveProductSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const payload = c.req.valid("json");
    const result = await getWaveService(c).upsertWaveProduct({
      user,
      waveId: id,
      payload,
    });
    return c.json(
      { wave_product: result.wave_product },
      result.created ? 201 : 200
    );
  }
);

// DELETE /api/v1/waves/:id/products/:wave_product_id
wavesRoutes.delete(
  "/:id/products/:wave_product_id",
  authMiddleware,
  validate("param", waveProductParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id, wave_product_id } = c.req.valid("param");
    const result = await getWaveService(c).removeWaveProduct({
      user,
      waveId: id,
      waveProductId: wave_product_id,
    });
    return c.json({
      message: "Product removed from pre-order wave",
      id: result.id,
    });
  }
);
