import { Hono } from "hono";
import type { AppEnv } from "../../types/env";
import { booksCoreRoutes } from "./books";
import { bookCoversRoutes } from "./covers";
import { bookReviewsRoutes } from "./reviews";

export const booksRoutes = new Hono<AppEnv>();

booksRoutes.route("/", booksCoreRoutes);
booksRoutes.route("/", bookCoversRoutes);
booksRoutes.route("/", bookReviewsRoutes);
