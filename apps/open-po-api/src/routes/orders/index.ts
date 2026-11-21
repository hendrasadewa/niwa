import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import { ordersCoreRoutes } from "./orders";
import { orderReceiptsRoutes } from "./receipts";

export const ordersRoutes = new Hono<AppEnv>();

ordersRoutes.route("/", ordersCoreRoutes);
ordersRoutes.route("/", orderReceiptsRoutes);
