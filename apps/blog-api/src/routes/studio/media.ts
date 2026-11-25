import { Hono } from "hono";
import { BlogErrors } from "../../errors/blog";
import type { AppEnv } from "../../types/env";
import { getMediaService } from "../deps";

export const studioMediaRoutes = new Hono<AppEnv>();

async function extractUploadedFile(
  req: Request
): Promise<{ mimeType: string; fileBuffer: ArrayBuffer }> {
  const contentType = req.headers.get("Content-Type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw BlogErrors.mediaEmpty();
    }
    return {
      mimeType: file.type || "application/octet-stream",
      fileBuffer: await file.arrayBuffer(),
    };
  }

  return {
    mimeType: contentType.split(";")[0]?.trim() || "application/octet-stream",
    fileBuffer: await req.arrayBuffer(),
  };
}

studioMediaRoutes.post("/media", async (c) => {
  const file = await extractUploadedFile(c.req.raw);
  const uploaded = await getMediaService(c).uploadInlineImage(file);
  return c.json({ media: uploaded }, 201);
});

studioMediaRoutes.post("/cover", async (c) => {
  const file = await extractUploadedFile(c.req.raw);
  const uploaded = await getMediaService(c).uploadStagingCover(file);
  return c.json({ cover: uploaded }, 201);
});
