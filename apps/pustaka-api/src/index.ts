import { Hono } from "hono";

export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) =>
  c.json({
    service: "pustaka-api",
    status: "ok",
  })
);

export default app;
