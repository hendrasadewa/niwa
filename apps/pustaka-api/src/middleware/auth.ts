import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { createDb, users } from "../db";
import { getUserRolesAndPermissions } from "../db/rbac";
import type { AppEnv, JwtUserPayload } from "../types";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "Unauthorized", message: "Missing or invalid Authorization header" },
      401
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return c.json({ error: "Unauthorized", message: "Missing bearer token" }, 401);
  }

  try {
    const verified = (await verify(
      token,
      c.env.JWT_SECRET,
      "HS256"
    )) as unknown as JwtUserPayload;

    if (!verified || typeof verified.sub !== "string") {
      return c.json({ error: "Unauthorized", message: "Invalid token payload" }, 401);
    }

    const db = createDb(c.env.DB);
    const [userRecord] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, verified.sub))
      .limit(1);

    if (!userRecord) {
      return c.json({ error: "Unauthorized", message: "User no longer exists" }, 401);
    }

    const { roles, permissions } = await getUserRolesAndPermissions(
      db,
      userRecord.id
    );

    c.set("jwtPayload", verified);
    c.set("user", {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      roles,
      permissions,
    });

    await next();
  } catch {
    return c.json(
      { error: "Unauthorized", message: "Invalid or expired JWT token" },
      401
    );
  }
});
