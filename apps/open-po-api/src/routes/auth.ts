import { zValidator } from "@hono/zod-validator";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
} from "@niwa/open-po-validators";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { createDb, customerProfiles, stores } from "../db";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";
import {
  OPEN_PO_APP_ID,
  fetchAuthApi,
  mapAuthApiUserToOpenPoUser,
  type AuthApiResponsePayload,
} from "../utils/auth-client";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post(
  "/register",
  zValidator("json", registerSchema),
  async (c) => {
    const {
      email,
      password,
      name,
      whatsapp_number,
      default_shipping_address,
      role,
    } = c.req.valid("json");

    let authRes: Response;
    try {
      const userAgent = c.req.header("User-Agent");
      authRes = await fetchAuthApi(c.env, "/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userAgent ? { "User-Agent": userAgent } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          name,
          whatsapp_number,
          app_id: OPEN_PO_APP_ID,
          role,
        }),
      });
    } catch {
      return c.json(
        {
          error: "BadGateway",
          message: "Unable to reach authentication service",
        },
        502
      );
    }

    const authData = (await authRes
      .json()
      .catch(() => null)) as AuthApiResponsePayload | null;

    if (!authRes.ok || !authData?.user || !authData?.token) {
      return c.json(
        authData ?? {
          error: "AuthError",
          message: "Registration failed in authentication service",
        },
        authRes.status as ContentfulStatusCode
      );
    }

    const shippingAddress = default_shipping_address ?? null;
    if (shippingAddress !== null) {
      const db = createDb(c.env.DB);
      const now = Math.floor(Date.now() / 1000);
      await db
        .insert(customerProfiles)
        .values({
          user_id: authData.user.id,
          default_shipping_address: shippingAddress,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: customerProfiles.user_id,
          set: {
            default_shipping_address: shippingAddress,
            updated_at: now,
          },
        });
    }

    return c.json(
      {
        user: mapAuthApiUserToOpenPoUser(authData.user, shippingAddress),
        token: authData.token,
        ...(authData.refresh_token
          ? { refresh_token: authData.refresh_token }
          : {}),
        ...(authData.expires_in !== undefined
          ? { expires_in: authData.expires_in }
          : {}),
      },
      201
    );
  }
);

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  let authRes: Response;
  try {
    const userAgent = c.req.header("User-Agent");
    authRes = await fetchAuthApi(c.env, "/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userAgent ? { "User-Agent": userAgent } : {}),
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return c.json(
      {
        error: "BadGateway",
        message: "Unable to reach authentication service",
      },
      502
    );
  }

  const authData = (await authRes
    .json()
    .catch(() => null)) as AuthApiResponsePayload | null;

  if (!authRes.ok || !authData?.user || !authData?.token) {
    return c.json(
      authData ?? {
        error: "Unauthorized",
        message: "Invalid email or password",
      },
      authRes.status as ContentfulStatusCode
    );
  }

  const db = createDb(c.env.DB);
  const [profile] = await db
    .select({
      default_shipping_address: customerProfiles.default_shipping_address,
    })
    .from(customerProfiles)
    .where(eq(customerProfiles.user_id, authData.user.id))
    .limit(1);

  return c.json({
    user: mapAuthApiUserToOpenPoUser(
      authData.user,
      profile?.default_shipping_address ?? null
    ),
    token: authData.token,
    ...(authData.refresh_token
      ? { refresh_token: authData.refresh_token }
      : {}),
    ...(authData.expires_in !== undefined
      ? { expires_in: authData.expires_in }
      : {}),
  });
});

authRoutes.post(
  "/refresh",
  zValidator("json", refreshTokenSchema),
  async (c) => {
    const { refresh_token } = c.req.valid("json");

    let authRes: Response;
    try {
      const userAgent = c.req.header("User-Agent");
      authRes = await fetchAuthApi(c.env, "/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userAgent ? { "User-Agent": userAgent } : {}),
        },
        body: JSON.stringify({ refresh_token }),
      });
    } catch {
      return c.json(
        {
          error: "BadGateway",
          message: "Unable to reach authentication service",
        },
        502
      );
    }

    const authData = (await authRes
      .json()
      .catch(() => null)) as AuthApiResponsePayload | null;

    if (!authRes.ok || !authData?.user || !authData?.token) {
      return c.json(
        authData ?? {
          error: "Unauthorized",
          message: "Failed to refresh authentication token",
        },
        authRes.status as ContentfulStatusCode
      );
    }

    const db = createDb(c.env.DB);
    const [profile] = await db
      .select({
        default_shipping_address: customerProfiles.default_shipping_address,
      })
      .from(customerProfiles)
      .where(eq(customerProfiles.user_id, authData.user.id))
      .limit(1);

    return c.json({
      user: mapAuthApiUserToOpenPoUser(
        authData.user,
        profile?.default_shipping_address ?? null
      ),
      token: authData.token,
      ...(authData.refresh_token
        ? { refresh_token: authData.refresh_token }
        : {}),
      ...(authData.expires_in !== undefined
        ? { expires_in: authData.expires_in }
        : {}),
    });
  }
);

authRoutes.post("/logout", zValidator("json", logoutSchema), async (c) => {
  const { refresh_token } = c.req.valid("json");

  let authRes: Response;
  try {
    authRes = await fetchAuthApi(c.env, "/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
  } catch {
    return c.json(
      {
        error: "BadGateway",
        message: "Unable to reach authentication service",
      },
      502
    );
  }

  const authData = (await authRes
    .json()
    .catch(() => null)) as AuthApiResponsePayload | null;

  return c.json(
    authData ?? { message: "Logged out successfully" },
    authRes.status as ContentfulStatusCode
  );
});

authRoutes.post("/logout-all", authMiddleware, async (c) => {
  const authToken = c.get("authToken")!;

  let authRes: Response;
  try {
    authRes = await fetchAuthApi(c.env, "/api/v1/auth/logout-all", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch {
    return c.json(
      {
        error: "BadGateway",
        message: "Unable to reach authentication service",
      },
      502
    );
  }

  const authData = (await authRes
    .json()
    .catch(() => null)) as AuthApiResponsePayload | null;

  return c.json(
    authData ?? { message: "Logged out from all sessions" },
    authRes.status as ContentfulStatusCode
  );
});

authRoutes.put(
  "/password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const user = c.get("user")!;
    const authToken = c.get("authToken")!;
    const payload = c.req.valid("json");

    let authRes: Response;
    try {
      const userAgent = c.req.header("User-Agent");
      authRes = await fetchAuthApi(c.env, "/api/v1/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          ...(userAgent ? { "User-Agent": userAgent } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch {
      return c.json(
        {
          error: "BadGateway",
          message: "Unable to reach authentication service",
        },
        502
      );
    }

    const authData = (await authRes
      .json()
      .catch(() => null)) as AuthApiResponsePayload | null;

    if (!authRes.ok || !authData?.user || !authData?.token) {
      return c.json(
        authData ?? {
          error: "AuthError",
          message: "Failed to change password in authentication service",
        },
        authRes.status as ContentfulStatusCode
      );
    }

    return c.json({
      message: authData.message ?? "Password updated successfully",
      user: mapAuthApiUserToOpenPoUser(
        authData.user,
        user.default_shipping_address
      ),
      token: authData.token,
      ...(authData.refresh_token
        ? { refresh_token: authData.refresh_token }
        : {}),
      ...(authData.expires_in !== undefined
        ? { expires_in: authData.expires_in }
        : {}),
    });
  }
);

authRoutes.get("/profile", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = createDb(c.env.DB);
  const ownedStores = await db
    .select()
    .from(stores)
    .where(eq(stores.owner_id, user.id));

  return c.json({
    user,
    stores: ownedStores,
  });
});
