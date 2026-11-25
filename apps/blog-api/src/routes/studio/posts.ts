import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import {
  unpublishPostSchema,
  updatePublishedPostSchema,
  validate,
} from "../../validators";
import { getPostService } from "../deps";

export const studioPostsRoutes = new Hono<AppEnv>();

studioPostsRoutes.get("/", async (c) => {
  const posts = await getPostService(c).listPublicPosts();
  return c.json({ posts });
});

studioPostsRoutes.get("/:rkey", async (c) => {
  const rkey = c.req.param("rkey");
  const post = await getPostService(c).getStudioPostByRkey(rkey);
  return c.json({ post });
});

studioPostsRoutes.put(
  "/:rkey",
  validate("json", updatePublishedPostSchema),
  async (c) => {
    const rkey = c.req.param("rkey");
    const input = c.req.valid("json");
    const post = await getPostService(c).updatePublishedPost(rkey, input);
    return c.json({ post });
  }
);

studioPostsRoutes.post(
  "/:rkey/unpublish",
  validate("json", unpublishPostSchema),
  async (c) => {
    const rkey = c.req.param("rkey");
    const user = c.get("user");
    const input = c.req.valid("json");
    const result = await getPostService(c).unpublishPost(rkey, user.id, input);
    return c.json(result);
  }
);
