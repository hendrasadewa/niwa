import { createDbMiddleware } from "@niwa/api-core/middlewares";
import { createDb, type Database } from "../db";
import type { AppEnv } from "../types/env";

export const dbMiddleware = createDbMiddleware<AppEnv, Database>(createDb);
