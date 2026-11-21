import { Hono } from "hono";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import type { AppEnv } from "../../types/env";
import { meProgressRoutes } from "./progress";
import { meReadingListRoutes } from "./reading-list";

export const meRoutes = new Hono<AppEnv>();

meRoutes.use("*", authMiddleware, requirePermission("reading:manage"));

meRoutes.route("/reading-list", meReadingListRoutes);
meRoutes.route("/progress", meProgressRoutes);
