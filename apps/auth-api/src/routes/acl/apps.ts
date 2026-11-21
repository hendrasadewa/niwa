import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { createAppRepo } from "../../repositories/apps";
import { createPermissionRepo } from "../../repositories/permissions";
import { createRoleRepo } from "../../repositories/roles";
import { createAppService } from "../../services/apps";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import { appFilterQuerySchema, createAppSchema } from "../../validators/acl";

function getAppService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createAppService({
    appRepo: createAppRepo(db),
    roleRepo: createRoleRepo(db),
    permissionRepo: createPermissionRepo(db),
    ensureSeeded: () => ensureRbacSeeded(db),
  });
}

export const aclAppsRoutes = new Hono<AppEnv>();

// GET /api/v1/acl/apps
aclAppsRoutes.get("/", validate("query", appFilterQuerySchema), async (c) => {
  const { app_id } = c.req.valid("query");
  const apps = await getAppService(c).listApps(app_id);
  return c.json({ apps });
});

// POST /api/v1/acl/apps
aclAppsRoutes.post("/", validate("json", createAppSchema), async (c) => {
  const body = c.req.valid("json");
  const app = await getAppService(c).createApp(body);
  return c.json({ app }, 201);
});
