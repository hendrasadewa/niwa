import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { createAuthApiRepo } from "../repositories/auth-api";
import { createMediaStorageRepo } from "../repositories/media-storage";
import { createStoreRepo } from "../repositories/stores";
import { createWaveRepo } from "../repositories/waves";
import { createStoreService } from "../services/stores";
import type { AppEnv } from "../types/env";
import { toImageResponse } from "../utils/media";
import { validate } from "../validators";
import { extractUploadedImage } from "../validators/media";
import {
  createStoreSchema,
  idParamSchema,
  storeQuerySchema,
  updateStoreSchema,
} from "../validators/stores";

function getStoreService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createStoreService({
    storeRepo: createStoreRepo(db),
    waveRepo: createWaveRepo(db),
    authApiRepo: createAuthApiRepo({
      authApi: c.env.AUTH_API,
      authApiUrl: c.env.AUTH_API_URL,
    }),
    mediaStorageRepo: createMediaStorageRepo(c.env.BUCKET),
  });
}

export const storesRoutes = new Hono<AppEnv>();

// GET /api/v1/stores
storesRoutes.get("/", validate("query", storeQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const stores = await getStoreService(c).listStores(query);
  return c.json({ stores });
});

// POST /api/v1/stores
storesRoutes.post(
  "/",
  authMiddleware,
  validate("json", createStoreSchema),
  async (c) => {
    const user = c.get("user")!;
    const authToken = c.get("authToken")!;
    const payload = c.req.valid("json");
    const result = await getStoreService(c).createStore({
      user,
      authToken,
      payload,
    });
    return c.json(result, 201);
  }
);

// GET /api/v1/stores/:id
storesRoutes.get("/:id", validate("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const store = await getStoreService(c).getStore(id);
  return c.json({ store });
});

// PUT /api/v1/stores/:id
storesRoutes.put(
  "/:id",
  authMiddleware,
  validate("param", idParamSchema),
  validate("json", updateStoreSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const store = await getStoreService(c).updateStore({
      user,
      storeIdOrSlug: id,
      updates,
    });
    return c.json({ store });
  }
);

// PUT /api/v1/stores/:id/logo
storesRoutes.put(
  "/:id/logo",
  authMiddleware,
  validate("param", idParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.valid("param");
    const image = await extractUploadedImage(c, ["logo", "file", "image"]);
    const result = await getStoreService(c).uploadLogo({
      user,
      storeIdOrSlug: id,
      image,
    });
    return c.json(result);
  }
);

// GET /api/v1/stores/:id/logo
storesRoutes.get("/:id/logo", validate("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const object = await getStoreService(c).getLogo(id);
  return toImageResponse(object);
});

// GET /api/v1/stores/:id/waves/active
storesRoutes.get(
  "/:id/waves/active",
  validate("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await getStoreService(c).getActiveWaves(id);
    return c.json(result);
  }
);
