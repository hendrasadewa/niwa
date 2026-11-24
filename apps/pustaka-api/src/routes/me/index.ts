import { Hono } from "hono";
import { authMiddleware } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import type { AppEnv } from "../../types/env";
import { meBooksRoutes } from "./books";
import { meProgressRoutes } from "./progress";
import { meReadingListRoutes } from "./reading-list";

export const meRoutes = new Hono<AppEnv>();

meRoutes.use("*", authMiddleware);

meRoutes.route("/books", meBooksRoutes);

meRoutes.use("/reading-list/*", requirePermission("reading:manage"));
meRoutes.use("/reading-list", requirePermission("reading:manage"));
meRoutes.route("/reading-list", meReadingListRoutes);

meRoutes.use("/progress/*", requirePermission("reading:manage"));
meRoutes.route("/progress", meProgressRoutes);
