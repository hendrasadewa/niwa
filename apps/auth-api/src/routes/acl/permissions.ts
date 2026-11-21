import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { createAppRepo } from "../../repositories/apps";
import { createPermissionRepo } from "../../repositories/permissions";
import { createPermissionService } from "../../services/permissions";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  appFilterQuerySchema,
  createPermissionSchema,
  permissionIdParamSchema,
} from "../../validators/acl";

function getPermissionService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createPermissionService({
    appRepo: createAppRepo(db),
    permissionRepo: createPermissionRepo(db),
    ensureSeeded: () => ensureRbacSeeded(db),
  });
}

export const aclPermissionsRoutes = new Hono<AppEnv>();

// GET /api/v1/acl/permissions
aclPermissionsRoutes.get(
  "/",
  validate("query", appFilterQuerySchema),
  async (c) => {
    const { app_id } = c.req.valid("query");
    const permissions = await getPermissionService(c).listPermissions(app_id);
    return c.json({ permissions });
  }
);

// POST /api/v1/acl/permissions
aclPermissionsRoutes.post(
  "/",
  validate("json", createPermissionSchema),
  async (c) => {
    const body = c.req.valid("json");
    const permission = await getPermissionService(c).createPermission(body);
    return c.json({ permission }, 201);
  }
);

// DELETE /api/v1/acl/permissions/:permissionId
aclPermissionsRoutes.delete(
  "/:permissionId",
  validate("param", permissionIdParamSchema),
  async (c) => {
    const { permissionId } = c.req.valid("param");
    const { id } = await getPermissionService(c).deletePermission(permissionId);
    return c.json({
      message: "Permission deleted successfully",
      id,
    });
  }
);
