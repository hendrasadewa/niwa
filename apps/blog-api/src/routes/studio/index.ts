import { Hono } from "hono";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/rbac";
import type { AppEnv } from "../../types/env";
import { studioDraftsRoutes } from "./drafts";
import { studioMediaRoutes } from "./media";
import { studioPostsRoutes } from "./posts";
import { studioPublicationRoutes } from "./publication";

export const studioRoutes = new Hono<AppEnv>();

// Guard all Studio endpoints once at the domain aggregator
studioRoutes.use("*", authMiddleware, requireRole("admin"));

studioRoutes.route("/drafts", studioDraftsRoutes);
studioRoutes.route("/posts", studioPostsRoutes);
studioRoutes.route("/", studioPublicationRoutes);
studioRoutes.route("/", studioMediaRoutes);
