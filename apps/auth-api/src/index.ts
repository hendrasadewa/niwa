import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) =>
  c.json({
    service: "niwa-auth-api",
    status: "ok",
  })
);

export default app;
