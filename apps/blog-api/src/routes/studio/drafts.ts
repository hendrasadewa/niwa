import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import {
  createDraftSchema,
  publishDraftSchema,
  updateDraftSchema,
  validate,
} from "../../validators";
import { getDraftService, getPostService } from "../deps";

export const studioDraftsRoutes = new Hono<AppEnv>();

studioDraftsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const drafts = await getDraftService(c).listDrafts(user.id);
  return c.json({ drafts });
});

studioDraftsRoutes.post("/", validate("json", createDraftSchema), async (c) => {
  const user = c.get("user");
  const input = c.req.valid("json");
  const draft = await getDraftService(c).createDraft(user.id, input);
  return c.json({ draft }, 201);
});

studioDraftsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const draft = await getDraftService(c).getDraft(id);
  return c.json({ draft });
});

studioDraftsRoutes.patch(
  "/:id",
  validate("json", updateDraftSchema),
  async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");
    const draft = await getDraftService(c).updateDraft(id, input);
    return c.json({ draft });
  }
);

studioDraftsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await getDraftService(c).deleteDraft(id);
  return c.json({ deleted: true });
});

studioDraftsRoutes.post(
  "/:id/publish",
  validate("json", publishDraftSchema),
  async (c) => {
    const id = c.req.param("id");
    const input = c.req.valid("json");
    const post = await getPostService(c).publishDraft(id, input);
    return c.json({ post }, 201);
  }
);
