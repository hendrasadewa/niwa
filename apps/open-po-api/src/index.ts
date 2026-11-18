import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use("*", cors());

app.get("/", (c) =>
  c.json({
    service: "open-po-api",
    status: "ok",
  })
);

export default app;
