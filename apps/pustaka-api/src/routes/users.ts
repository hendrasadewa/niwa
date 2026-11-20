import { zValidator } from "@hono/zod-validator";
import { assignRoleSchema } from "@niwa/pustaka-validators";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppEnv } from "../types";
import {
  PUSTAKA_APP_ID,
  fetchAuthApi,
  mapAuthApiUserToPustakaUser,
  type AuthApiResponsePayload,
} from "../utils/auth-client";

export const usersRoutes = new Hono<AppEnv>();

usersRoutes.get("/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// GET /api/v1/users - List users via @niwa/auth-api ACL service (Admin / users:manage)
usersRoutes.get(
  "/",
  authMiddleware,
  requirePermission("users:manage"),
  async (c) => {
    const authToken = c.get("authToken");
    const search = c.req.query("search");
    const query = new URLSearchParams();
    if (search) {
      query.set("search", search);
    }
    const qs = query.toString();
    const path = qs ? `/api/v1/acl/users?${qs}` : "/api/v1/acl/users";

    let authRes: Response;
    try {
      authRes = await fetchAuthApi(c.env, path, {
        method: "GET",
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

    if (!authRes.ok || !authData?.users) {
      return c.json(
        authData ?? {
          error: "AuthError",
          message: "Failed to list users from authentication service",
        },
        authRes.status as ContentfulStatusCode
      );
    }

    return c.json({
      total: authData.users.length,
      users: authData.users.map(mapAuthApiUserToPustakaUser),
    });
  }
);

// POST /api/v1/users/:id/roles - Assign Pustaka role via @niwa/auth-api ACL service (Admin / users:manage)
usersRoutes.post(
  "/:id/roles",
  authMiddleware,
  requirePermission("users:manage"),
  zValidator("json", assignRoleSchema),
  async (c) => {
    const authToken = c.get("authToken");
    const targetUserId = c.req.param("id");
    const { role } = c.req.valid("json");

    // Promote to ["member", "admin"] or set to ["member"] via auth-api ACL bulk-set endpoint
    const nextRoles = role === "admin" ? ["member", "admin"] : ["member"];

    let authRes: Response;
    try {
      authRes = await fetchAuthApi(
        c.env,
        `/api/v1/acl/users/${encodeURIComponent(targetUserId)}/roles`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            app_id: PUSTAKA_APP_ID,
            roles: nextRoles,
          }),
        }
      );
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

    if (!authRes.ok || !authData?.user) {
      return c.json(
        authData ?? {
          error: "AuthError",
          message: "Failed to update user roles in authentication service",
        },
        authRes.status as ContentfulStatusCode
      );
    }

    return c.json({
      user: mapAuthApiUserToPustakaUser(authData.user),
    });
  }
);
