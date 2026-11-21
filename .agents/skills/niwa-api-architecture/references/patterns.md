# Niwa API Architecture — TypeScript Reference Patterns

Use these copy-ready blueprints when implementing or refactoring any `apps/*-api` service.

---

## 1. Hono Environment (`src/types/env.ts`)

```ts
import type { Database } from "../db";

export type Bindings = {
  DB: D1Database;
  // Add worker secrets/vars here
};

export type Variables = {
  db: Database;
  // Add request-scoped state (e.g., user, jwtPayload)
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
```

---

## 2. Drizzle Per-Request Factory (`src/db/index.ts`) & Middleware (`src/middlewares/db.ts`)

```ts
// src/db/index.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;
export * from "./schema";
```

```ts
// src/middlewares/db.ts
import { createMiddleware } from "hono/factory";
import { createDb } from "../db";
import type { AppEnv } from "../types/env";

export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});
```

---

## 3. Error Catalog (`src/errors/`)

```ts
// src/errors/app-error.ts
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type AppErrorOptions = {
  status: ContentfulStatusCode;
  error: string;
  code: string;
  message: string;
  details?: unknown;
};

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly error: string;
  readonly code: string;
  readonly details?: unknown;

  constructor(opts: AppErrorOptions) {
    super(opts.message);
    this.name = "AppError";
    this.status = opts.status;
    this.error = opts.error;
    this.code = opts.code;
    this.details = opts.details;
  }
}
```

```ts
// src/errors/common.ts
import { AppError } from "./app-error";

export const CommonErrors = {
  validation: (details: unknown, message = "Validation failed") =>
    new AppError({
      status: 400,
      error: "Validation Error",
      code: "VALIDATION_ERROR",
      message,
      details,
    }),

  unauthorized: (message = "Authentication required", code = "UNAUTHORIZED") =>
    new AppError({ status: 401, error: "Unauthorized", code, message }),

  forbidden: (message = "Insufficient permissions", code = "FORBIDDEN") =>
    new AppError({ status: 403, error: "Forbidden", code, message }),

  notFound: (message = "Resource not found", code = "NOT_FOUND") =>
    new AppError({ status: 404, error: "Not Found", code, message }),
};
```

```ts
// src/errors/handler.ts
import type { ErrorHandler, NotFoundHandler } from "hono";
import type { AppEnv } from "../types/env";
import { AppError } from "./app-error";

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.error,
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      err.status
    );
  }

  console.error("[UnhandledError]", err);
  return c.json(
    {
      error: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
    500
  );
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(
    {
      error: "Not Found",
      code: "ROUTE_NOT_FOUND",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
```

---

## 4. Unified Zod Validator Wrapper (`src/validators/index.ts`)

```ts
import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { CommonErrors } from "../errors/common";

export function validate<
  Target extends keyof ValidationTargets,
  Schema extends ZodType,
>(target: Target, schema: Schema) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw CommonErrors.validation(details, "Invalid request payload");
    }
  });
}
```

---

## 5. Factory Repository (`src/repositories/<resource>.ts`)

- Accepts `db: Database`.
- Returns plain query methods + exports its inferred interface (`type XRepo`).
- Uses `db.batch([...])` for multi-statement atomic writes on D1.

```ts
import { eq } from "drizzle-orm";
import { apps, type Database } from "../db";

export function createAppRepo(db: Database) {
  return {
    async findById(id: string) {
      const [row] = await db
        .select()
        .from(apps)
        .where(eq(apps.id, id))
        .limit(1);
      return row ?? null;
    },

    async findAll() {
      return db.select().from(apps);
    },

    async create(input: typeof apps.$inferInsert) {
      await db.insert(apps).values(input);
      return input;
    },
  };
}

export type AppRepo = ReturnType<typeof createAppRepo>;
```

---

## 6. Factory Service (`src/services/<resource>.ts`)

- Pure business logic — **no `hono` imports, no Drizzle table imports**.
- Depends only on repository interfaces, pure `utils/`, and catalog errors.

```ts
import { AclErrors } from "../errors/acl";
import type { AppRepo } from "../repositories/apps";
import type { RoleRepo } from "../repositories/roles";

export type AppServiceDeps = {
  appRepo: AppRepo;
  roleRepo: RoleRepo;
};

export function createAppService({ appRepo, roleRepo }: AppServiceDeps) {
  return {
    async createApp(input: { id: string; name: string; description: string }) {
      const existing = await appRepo.findById(input.id);
      if (existing) {
        throw AclErrors.appAlreadyExists(input.id);
      }

      const created = await appRepo.create(input);
      await roleRepo.seedDefaultAppRoles(input.id);
      return created;
    },
  };
}

export type AppService = ReturnType<typeof createAppService>;
```

---

## 7. Thin Route with Per-Route DI Helper (`src/routes/<domain>/<resource>.ts`)

- Instantiates only the repos & service needed by this sub-resource.
- Zero `try/catch` for domain errors (handled by `app.onError`).

```ts
import { Hono, type Context } from "hono";
import { createAppRepo } from "../../repositories/apps";
import { createRoleRepo } from "../../repositories/roles";
import { createAppService } from "../../services/apps";
import type { AppEnv } from "../../types/env";
import { validate } from "../../validators";
import { createAppSchema } from "../../validators/acl";

function getAppService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createAppService({
    appRepo: createAppRepo(db),
    roleRepo: createRoleRepo(db),
  });
}

export const aclAppsRoutes = new Hono<AppEnv>();

aclAppsRoutes.post("/", validate("json", createAppSchema), async (c) => {
  const body = c.req.valid("json");
  const app = await getAppService(c).createApp(body);
  return c.json({ app }, 201);
});
```

---

## 8. Entrypoint Assembly (`src/index.ts`)

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, notFoundHandler } from "./errors/handler";
import { dbMiddleware } from "./middlewares/db";
import { aclRoutes } from "./routes/acl";
import { authRoutes } from "./routes/auth";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("/api/*", dbMiddleware);

app.onError(errorHandler);
app.notFound(notFoundHandler);

app.get("/", (c) => c.json({ service: "niwa-auth-api", status: "ok" }));

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/acl", aclRoutes);

export default app;
```
