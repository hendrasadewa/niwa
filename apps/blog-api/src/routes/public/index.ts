import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import {
  getMediaService,
  getPostService,
  getPublicationService,
} from "../deps";

export const publicRoutes = new Hono<AppEnv>();

publicRoutes.get("/publication", async (c) => {
  const publication = await getPublicationService(c).getPublication();
  c.header("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return c.json({ publication });
});

publicRoutes.get("/posts", async (c) => {
  const includeFull = c.req.query("full") === "true";
  const postService = getPostService(c);
  const posts = includeFull
    ? await postService.listPublicPostsFull()
    : await postService.listPublicPosts();
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
  return c.json({ posts });
});

publicRoutes.get("/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const post = await getPostService(c).getPublicPostBySlug(slug);
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
  return c.json({ post });
});

publicRoutes.get("/media/*", async (c) => {
  const url = new URL(c.req.url);
  const marker = "/media/";
  const idx = url.pathname.indexOf(marker);
  const key = idx >= 0 ? decodeURIComponent(url.pathname.slice(idx + marker.length)) : "";
  const media = await getMediaService(c).getPublicMedia(key);
  return new Response(media.body, {
    status: 200,
    headers: {
      "Content-Type": media.contentType,
      ETag: media.etag,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

publicRoutes.get("/blobs/:cid", async (c) => {
  const cid = c.req.param("cid");
  const blob = await getMediaService(c).getPublicBlob(cid);
  return new Response(blob.body, {
    status: 200,
    headers: {
      "Content-Type": blob.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
