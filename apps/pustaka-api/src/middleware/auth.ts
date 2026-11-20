import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import type { AppEnv, NiwaJwtPayload, RoleName } from "../types";
import { PUSTAKA_APP_ID } from "../utils/auth-client";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      },
      401
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return c.json(
      { error: "Unauthorized", message: "Missing bearer token" },
      401
    );
  }

  try {
    const verified = (await verify(
      token,
      c.env.JWT_SECRET,
      "HS256"
    )) as unknown as NiwaJwtPayload;

    if (
      !verified ||
      typeof verified.sub !== "string" ||
      typeof verified.email !== "string" ||
      typeof verified.name !== "string"
    ) {
      return c.json(
        { error: "Unauthorized", message: "Invalid token payload" },
        401
      );
    }

    const pustakaRoles = Array.isArray(verified.app_roles?.[PUSTAKA_APP_ID])
      ? (verified.app_roles[PUSTAKA_APP_ID] as RoleName[])
      : [];
    const pustakaPermissions = Array.isArray(
      verified.app_permissions?.[PUSTAKA_APP_ID]
    )
      ? verified.app_permissions[PUSTAKA_APP_ID]
      : [];

    c.set("jwtPayload", verified);
    c.set("authToken", token);
    c.set("user", {
      id: verified.sub,
      username: verified.name,
      email: verified.email,
      roles: pustakaRoles,
      permissions: pustakaPermissions,
      created_at: verified.created_at ?? verified.iat,
    });

    await next();
  } catch {
    return c.json(
      { error: "Unauthorized", message: "Invalid or expired JWT token" },
      401
    );
  }
});
