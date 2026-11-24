# Niwa API Architecture — TypeScript Reference Patterns

Use these copy-ready blueprints when implementing or refactoring any `apps/*-api` service. Shared core primitives live in `packages/api-core` (`@niwa/api-core`).

---

## 1. Hono Environment (`src/types/env.ts`)

```ts
import type { Database } from "../db";

export type Bindings = {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  // Add worker secrets/vars/bindings (BUCKET, AUTH_API, JWT_ISSUER, etc.) here
};

export type Variables = {
  db: Database;
  // Add request-scoped state (e.g., user, jwtPayload, authToken)
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
import { createDbMiddleware } from "@niwa/api-core/middlewares";
import { createDb, type Database } from "../db";
import type { AppEnv } from "../types/env";

export const dbMiddleware = createDbMiddleware<AppEnv, Database>(createDb);
```

---

## 3. Error Catalog (`src/errors/`)

`AppError`, `CommonErrors`, `errorHandler`, and `notFoundHandler` live in `@niwa/api-core/errors`. Apps only define domain-specific error factories and re-export the shared primitives from `src/errors/index.ts`.

```ts
// src/errors/index.ts
export {
  AppError,
  CommonErrors,
  errorHandler,
  notFoundHandler,
  type AppErrorOptions,
} from "@niwa/api-core/errors";
export * from "./auth";
export * from "./<domain>";
```

```ts
// src/errors/<domain>.ts
import { AppError } from "@niwa/api-core/errors";

export const DomainErrors = {
  notFound: (id: string) =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ITEM_NOT_FOUND",
      message: `Item ${id} not found`,
    }),
};
```

---

## 4. Unified Zod Validator Wrapper (`src/validators/index.ts`) & RBAC (`src/middlewares/rbac.ts`)

```ts
// src/validators/index.ts
export { validate } from "@niwa/api-core/validators";
```

```ts
// src/middlewares/rbac.ts
import { createRbacMiddlewares } from "@niwa/api-core/middlewares";
import { AuthErrors } from "../errors/auth";
import type { RoleName } from "../types/auth";
import type { AppEnv } from "../types/env";

export const { requireRole, requirePermission } = createRbacMiddlewares<
  AppEnv,
  RoleName
>({
  onInsufficientRole: (allowedRoles) => AuthErrors.insufficientRole(allowedRoles),
  onMissingPermissions: (requiredPermissions) =>
    AuthErrors.missingPermissions(requiredPermissions),
});
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
import { errorHandler, notFoundHandler } from "@niwa/api-core/errors";
import { createOriginCorsMiddleware } from "@niwa/api-core/middlewares";
import { Hono } from "hono";
import { dbMiddleware } from "./middlewares/db";
import { itemsRoutes } from "./routes/items";
import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use(
  "*",
  createOriginCorsMiddleware<AppEnv>({
    defaultAllowedOrigins: ["https://<product>.hendrasadewa.com"],
  })
);
app.use("/api/*", dbMiddleware);

app.onError(errorHandler);
app.notFound(notFoundHandler);

app.get("/", (c) => c.json({ service: "<product>-api", status: "ok" }));

app.route("/api/v1/items", itemsRoutes);

export default app;
```
