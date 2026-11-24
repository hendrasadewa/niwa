import type { Env } from "hono";
import { createMiddleware } from "hono/factory";

export type DbEnv<TDb> = Env & {
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    db: TDb;
  };
};

export function createDbMiddleware<TEnv extends DbEnv<TDb>, TDb>(
  createDb: (d1: D1Database) => TDb
) {
  return createMiddleware<TEnv>(async (c, next) => {
    c.set("db", createDb(c.env.DB));
    await next();
  });
}
