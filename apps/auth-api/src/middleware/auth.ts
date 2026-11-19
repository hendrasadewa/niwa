import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { createDb, users } from "../db";
import { getUserAppRolesAndPermissions } from "../db/rbac";
import type { AppEnv, AuthUserResponse, NiwaJwtPayload } from "../types";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");

  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  } else if (queryToken) {
    token = queryToken.trim();
  }

  if (!token) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      },
      401
    );
  }

  try {
    const verified = (await verify(
      token,
      c.env.JWT_SECRET,
      "HS256"
    )) as unknown as NiwaJwtPayload;

    if (!verified || typeof verified.sub !== "string") {
      return c.json(
        { error: "Unauthorized", message: "Invalid JWT token payload" },
        401
      );
    }

    const db = createDb(c.env.DB);
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, verified.sub))
      .limit(1);

    if (!userRecord || !userRecord.is_active) {
      return c.json(
        { error: "Unauthorized", message: "User not found or inactive" },
        401
      );
    }

    const { app_roles, app_permissions } =
      await getUserAppRolesAndPermissions(db, userRecord.id);

    const authUser: AuthUserResponse = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      whatsapp_number: userRecord.whatsapp_number,
      is_active: userRecord.is_active,
      app_roles,
      app_permissions,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    };

    c.set("jwtPayload", verified);
    c.set("user", authUser);

    await next();
  } catch {
    return c.json(
      { error: "Unauthorized", message: "Invalid or expired JWT token" },
      401
    );
  }
});
