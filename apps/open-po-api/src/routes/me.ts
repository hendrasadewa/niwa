import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { createAuthApiRepo } from "../repositories/auth-api";
import { createCustomerProfileRepo } from "../repositories/customer-profiles";
import { createOrderRepo } from "../repositories/orders";
import { createStoreRepo } from "../repositories/stores";
import { createMeService } from "../services/me";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import { updateProfileSchema } from "../validators/auth";

function getMeService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createMeService({
    authApiRepo: createAuthApiRepo({
      authApi: c.env.AUTH_API,
      authApiUrl: c.env.AUTH_API_URL,
    }),
    customerProfileRepo: createCustomerProfileRepo(db),
    storeRepo: createStoreRepo(db),
    orderRepo: createOrderRepo(db),
  });
}

export const meRoutes = new Hono<AppEnv>();

meRoutes.use("*", authMiddleware);

// GET /api/v1/me
meRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const result = await getMeService(c).getProfile(user);
  return c.json(result);
});

// PUT /api/v1/me
meRoutes.put("/", validate("json", updateProfileSchema), async (c) => {
  const user = c.get("user")!;
  const authToken = c.get("authToken")!;
  const updates = c.req.valid("json");
  const result = await getMeService(c).updateProfile({
    user,
    authToken,
    updates,
  });
  return c.json(result);
});

// GET /api/v1/me/stores
meRoutes.get("/stores", async (c) => {
  const user = c.get("user")!;
  const stores = await getMeService(c).listOwnedStores(user.id);
  return c.json({ stores });
});

// GET /api/v1/me/orders
meRoutes.get("/orders", async (c) => {
  const user = c.get("user")!;
  const orders = await getMeService(c).listMyOrders(user.id);
  return c.json({ orders });
});
