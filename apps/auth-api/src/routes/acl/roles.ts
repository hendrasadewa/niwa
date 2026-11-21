import { Hono, type Context } from "hono";
import { ensureRbacSeeded } from "../../db/seed";
import { createAppRepo } from "../../repositories/apps";
import { createPermissionRepo } from "../../repositories/permissions";
import { createRoleRepo } from "../../repositories/roles";
import { createRoleService } from "../../services/roles";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import {
  appFilterQuerySchema,
  createRoleSchema,
  roleIdParamSchema,
  updateRolePermissionsSchema,
} from "../../validators/acl";

function getRoleService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createRoleService({
    appRepo: createAppRepo(db),
    roleRepo: createRoleRepo(db),
    permissionRepo: createPermissionRepo(db),
    ensureSeeded: () => ensureRbacSeeded(db),
  });
}

export const aclRolesRoutes = new Hono<AppEnv>();

// GET /api/v1/acl/roles
aclRolesRoutes.get("/", validate("query", appFilterQuerySchema), async (c) => {
  const { app_id } = c.req.valid("query");
  const roles = await getRoleService(c).listRoles(app_id);
  return c.json({ roles });
});

// POST /api/v1/acl/roles
aclRolesRoutes.post("/", validate("json", createRoleSchema), async (c) => {
  const body = c.req.valid("json");
  const role = await getRoleService(c).createRole(body);
  return c.json({ role }, 201);
});

// PUT /api/v1/acl/roles/:roleId/permissions
aclRolesRoutes.put(
  "/:roleId/permissions",
  validate("param", roleIdParamSchema),
  validate("json", updateRolePermissionsSchema),
  async (c) => {
    const { roleId } = c.req.valid("param");
    const { permission_slugs } = c.req.valid("json");
    const role = await getRoleService(c).updateRolePermissions({
      roleId,
      permission_slugs,
    });
    return c.json({ role });
  }
);

// DELETE /api/v1/acl/roles/:roleId
aclRolesRoutes.delete(
  "/:roleId",
  validate("param", roleIdParamSchema),
  async (c) => {
    const { roleId } = c.req.valid("param");
    const { id } = await getRoleService(c).deleteRole(roleId);
    return c.json({
      message: "Role deleted successfully",
      id,
    });
  }
);
