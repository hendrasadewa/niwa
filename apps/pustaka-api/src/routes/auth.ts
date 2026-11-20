import { zValidator } from "@hono/zod-validator";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
} from "@niwa/pustaka-validators";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";
import {
  PUSTAKA_APP_ID,
  fetchAuthApi,
  mapAuthApiUserToPustakaUser,
  type AuthApiResponsePayload,
} from "../utils/auth-client";

export const authRoutes = new Hono<AppEnv>();

// POST /api/v1/auth/register - Delegate registration to @niwa/auth-api (app_id: "pustaka")
authRoutes.post(
  "/register",
  zValidator("json", registerSchema),
  async (c) => {
    const { username, email, password } = c.req.valid("json");

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
          name: username,
          app_id: PUSTAKA_APP_ID,
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

    return c.json(
      {
        user: mapAuthApiUserToPustakaUser(authData.user),
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

// POST /api/v1/auth/login - Delegate login to @niwa/auth-api with automatic Pustaka SSO enrollment
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

  let resolvedAuthUser = authData.user;
  let resolvedToken = authData.token;
  let resolvedExpiresIn = authData.expires_in;

  // SSO auto-enrollment: if an existing Niwa user (e.g. from Open-PO) has no Pustaka role yet,
  // automatically grant the default Pustaka 'member' role so they can browse & track reading.
  const existingPustakaRoles = resolvedAuthUser.app_roles?.[PUSTAKA_APP_ID];
  if (!existingPustakaRoles || existingPustakaRoles.length === 0) {
    try {
      const grantRes = await fetchAuthApi(c.env, "/api/v1/auth/roles/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({
          app_id: PUSTAKA_APP_ID,
          role: "member",
        }),
      });
      if (grantRes.ok) {
        const grantData = (await grantRes
          .json()
          .catch(() => null)) as AuthApiResponsePayload | null;
        if (grantData?.user && grantData?.token) {
          resolvedAuthUser = grantData.user;
          resolvedToken = grantData.token;
          if (grantData.expires_in !== undefined) {
            resolvedExpiresIn = grantData.expires_in;
          }
        }
      }
    } catch {
      // Proceed with login even if auto-enrollment temporarily fails
    }
  }

  return c.json({
    user: mapAuthApiUserToPustakaUser(resolvedAuthUser),
    token: resolvedToken,
    ...(authData.refresh_token
      ? { refresh_token: authData.refresh_token }
      : {}),
    ...(resolvedExpiresIn !== undefined
      ? { expires_in: resolvedExpiresIn }
      : {}),
  });
});

// POST /api/v1/auth/refresh - Delegate refresh token rotation to @niwa/auth-api
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

    return c.json({
      user: mapAuthApiUserToPustakaUser(authData.user),
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

// POST /api/v1/auth/logout - Revoke refresh token session family
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

// POST /api/v1/auth/logout-all - Revoke all active refresh token sessions for current user
authRoutes.post("/logout-all", authMiddleware, async (c) => {
  const authToken = c.get("authToken");

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

// PUT /api/v1/auth/password - Change password via @niwa/auth-api
authRoutes.put(
  "/password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const authToken = c.get("authToken");
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
      user: mapAuthApiUserToPustakaUser(authData.user),
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
  const user = c.get("user");
  return c.json({ user });
});
