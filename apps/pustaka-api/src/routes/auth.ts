import { Hono, type Context } from "hono";
import { authMiddleware } from "../middlewares/auth";
import { createAuthApiRepo } from "../repositories/auth-api";
import { createAuthService } from "../services/auth";
import type { AppEnv } from "../types/env";
import { validate } from "../validators";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
} from "../validators/auth";

function getAuthService(c: Context<AppEnv>) {
  return createAuthService({
    authApiRepo: createAuthApiRepo({
      authApi: c.env.AUTH_API,
      authApiUrl: c.env.AUTH_API_URL,
    }),
  });
}

export const authRoutes = new Hono<AppEnv>();

// POST /api/v1/auth/register
authRoutes.post("/register", validate("json", registerSchema), async (c) => {
  const body = c.req.valid("json");
  const result = await getAuthService(c).register({
    ...body,
    userAgent: c.req.header("User-Agent"),
  });
  return c.json(result, 201);
});

// POST /api/v1/auth/login
authRoutes.post("/login", validate("json", loginSchema), async (c) => {
  const body = c.req.valid("json");
  const result = await getAuthService(c).login({
    ...body,
    userAgent: c.req.header("User-Agent"),
  });
  return c.json(result);
});

// POST /api/v1/auth/refresh
authRoutes.post("/refresh", validate("json", refreshTokenSchema), async (c) => {
  const { refresh_token } = c.req.valid("json");
  const result = await getAuthService(c).refresh({
    refresh_token,
    userAgent: c.req.header("User-Agent"),
  });
  return c.json(result);
});

// POST /api/v1/auth/logout
authRoutes.post("/logout", validate("json", logoutSchema), async (c) => {
  const { refresh_token } = c.req.valid("json");
  const result = await getAuthService(c).logout(refresh_token);
  return c.json(result);
});

// POST /api/v1/auth/logout-all
authRoutes.post("/logout-all", authMiddleware, async (c) => {
  const authToken = c.get("authToken");
  const result = await getAuthService(c).logoutAll(authToken);
  return c.json(result);
});

// PUT /api/v1/auth/password
authRoutes.put(
  "/password",
  authMiddleware,
  validate("json", changePasswordSchema),
  async (c) => {
    const authToken = c.get("authToken");
    const payload = c.req.valid("json");
    const result = await getAuthService(c).changePassword({
      authToken,
      payload,
      userAgent: c.req.header("User-Agent"),
    });
    return c.json(result);
  }
);

// GET /api/v1/auth/profile
authRoutes.get("/profile", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json({ user });
});
