import { Hono } from "hono";
import { authMiddleware } from "../../middlewares/auth";
import { requireAdmin } from "../../middlewares/rbac";
import type { AppEnv } from "../../types/env";
import { aclAppsRoutes } from "./apps";
import { aclPermissionsRoutes } from "./permissions";
import { aclRolesRoutes } from "./roles";
import { aclUsersRoutes } from "./users";

export const aclRoutes = new Hono<AppEnv>();

// Every ACL & Role Management endpoint requires an authenticated Admin
aclRoutes.use("*", authMiddleware, requireAdmin);

aclRoutes.route("/apps", aclAppsRoutes);
aclRoutes.route("/roles", aclRolesRoutes);
aclRoutes.route("/permissions", aclPermissionsRoutes);
aclRoutes.route("/users", aclUsersRoutes);
