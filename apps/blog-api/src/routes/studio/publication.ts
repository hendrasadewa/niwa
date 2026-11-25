import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import { upsertPublicationSchema, validate } from "../../validators";
import { getPostService, getPublicationService } from "../deps";

export const studioPublicationRoutes = new Hono<AppEnv>();

studioPublicationRoutes.get("/publication", async (c) => {
  const publication = await getPublicationService(c).getPublication({
    bypassCache: true,
  });
  return c.json({ publication });
});

studioPublicationRoutes.put(
  "/publication",
  validate("json", upsertPublicationSchema),
  async (c) => {
    const input = c.req.valid("json");
    const publication = await getPublicationService(c).upsertPublication(input);
    return c.json({ publication });
  }
);

studioPublicationRoutes.post("/cache/refresh", async (c) => {
  const result = await getPostService(c).refreshCache();
  return c.json(result);
});
