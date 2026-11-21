import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import { authCoreRoutes } from "./auth";
import { authEmailRoutes } from "./email";
import { authPasskeyRoutes } from "./passkeys";
import { authProfileRoutes } from "./profile";

export const authRoutes = new Hono<AppEnv>();

authRoutes.route("/", authCoreRoutes);
authRoutes.route("/", authEmailRoutes);
authRoutes.route("/", authPasskeyRoutes);
authRoutes.route("/", authProfileRoutes);
