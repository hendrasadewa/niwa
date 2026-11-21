import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import { authCoreRoutes } from "./auth";
import { authProfileRoutes } from "./profile";

export const authRoutes = new Hono<AppEnv>();

authRoutes.route("/", authCoreRoutes);
authRoutes.route("/", authProfileRoutes);
