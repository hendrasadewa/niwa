---
name: niwa-api-architecture
description: >-
  Canonical Hono v4, Drizzle ORM, Zod, and Cloudflare D1 layered API architecture
  for all Niwa backend services (apps/auth-api, apps/open-po-api, apps/pustaka-api,
  apps/web-api, and future apps/*-api). Use this skill whenever creating, refactoring,
  debugging, or inspecting endpoints, repositories, services, validators, middlewares,
  or error catalogs in any Niwa API app so context gathering and edits follow the
  exact monorepo convention with minimal round-trips.
---

# Niwa API Architecture (Hono + Drizzle + Cloudflare D1 + `@niwa/api-core`)

This skill defines the standard layered REST architecture shared across all `apps/*-api` services in the `niwa` monorepo (`apps/auth-api` is the reference implementation; shared boilerplate lives in `packages/api-core`).

## 1. Fast Context Lookup Map (Minimize Round-Trips)

Jump straight to the target file instead of exploring the whole directory tree:

| What you need | Exact path |
| :--- | :--- |
| Shared `AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler` | `packages/api-core/src/errors/` (`@niwa/api-core/errors`) |
| Shared Zod `validate()` wrapper | `packages/api-core/src/validators/` (`@niwa/api-core/validators`) |
| Shared `createDbMiddleware`, `createRbacMiddlewares`, `createOriginCorsMiddleware` | `packages/api-core/src/middlewares/` (`@niwa/api-core/middlewares`) |
| App wiring, origin CORS, `dbMiddleware`, `onError`, route mounting | `apps/<api>/src/index.ts` |
| Worker bindings, vars (`ALLOWED_ORIGINS`), D1/R2/Service Bindings | `apps/<api>/wrangler.jsonc` |
| Hono `Bindings`, `Variables` (`db`, `user`, etc.), `AppEnv`, DTOs | `apps/<api>/src/types/env.ts`, `types/<domain>.ts` |
| Drizzle `createDb(d1)` factory, `Database` type, schema, seed data | `apps/<api>/src/db/index.ts`, `db/schema.ts`, `db/seed.ts` |
| Domain error catalogs & barrel re-exporting `@niwa/api-core/errors` | `apps/<api>/src/errors/index.ts`, `errors/<domain>.ts` |
| Request hooks (`db`, ES256 JWT auth, RBAC guards) | `apps/<api>/src/middlewares/db.ts`, `auth.ts`, `rbac.ts` |
| Validator barrel (`validate` re-export) & request schemas | `apps/<api>/src/validators/index.ts`, `validators/<domain>.ts` |
| Reusable Drizzle queries (factory per resource) | `apps/<api>/src/repositories/<resource>.ts` |
| Pure business logic (factory DI per resource) | `apps/<api>/src/services/<resource>.ts` |
| Thin HTTP handlers (split by domain / sub-resource) | `apps/<api>/src/routes/<domain>/<resource>.ts` (or `routes/<resource>.ts`) |
| Pure stateless helpers (JWT wrapper, PBKDF2, hashing, formatting) | `apps/<api>/src/utils/<helper>.ts` |

## 2. Canonical Directory Layout

```text
apps/<api>/
├── wrangler.jsonc            # Cloudflare Workers config (D1, R2, Service Bindings, ALLOWED_ORIGINS)
├── drizzle.config.ts
├── drizzle/                  # Generated SQLite migrations (never hand-edit)
└── src/
    ├── index.ts              # Entrypoint: createOriginCorsMiddleware, dbMiddleware, onError, notFound, .route(...)
    ├── types/
    │   ├── index.ts
    │   ├── env.ts            # Bindings (DB, ALLOWED_ORIGINS, ...), Variables, AppEnv
    │   └── <domain>.ts       # Response / domain types
    ├── db/
    │   ├── index.ts          # createDb(d1) factory + Database type (NEVER a global singleton)
    │   ├── schema.ts         # Drizzle SQLite/D1 tables
    │   └── seed.ts           # Optional seed constants & isolate-memoized seed helper
    ├── errors/
    │   ├── index.ts          # Re-exports @niwa/api-core/errors + domain catalogs
    │   └── <domain>.ts       # Domain error catalog factories using AppError from @niwa/api-core/errors
    ├── middlewares/
    │   ├── db.ts             # createDbMiddleware<AppEnv, Database>(createDb)
    │   ├── auth.ts           # ES256 JWKS verification via @niwa/auth/server (throws AppError)
    │   └── rbac.ts           # createRbacMiddlewares<AppEnv, RoleName>({ ... })
    ├── validators/
    │   ├── index.ts          # export { validate } from "@niwa/api-core/validators"
    │   └── <domain>.ts       # Zod schemas (re-export from @niwa/*-validators when shared)
    ├── repositories/
    │   └── <resource>.ts     # create<Resource>Repo(db) → bound Drizzle queries
    ├── services/
    │   └── <resource>.ts     # create<Resource>Service({ ...repos, config? }) → business logic
    ├── routes/
    │   └── <domain>/
    │       ├── index.ts      # Domain aggregator (mounts sub-resources, applies domain guards once)
    │       └── <resource>.ts # Per-route factory helper + thin HTTP handlers
    └── utils/
        └── <helper>.ts       # Pure functions only (zero DB, zero Hono imports)
```

## 3. Non-Negotiable Architecture Rules

1. **One-way dependency flow**:
   `index.ts` → `middlewares` / `routes` → `services` → `repositories` → `db`
   (`utils/`, `types/`, and `errors/` have no upward dependencies.)
2. **Strict layer isolation**:
   - `routes/`: HTTP only (routing, `validate(...)`, reading `c.get(...)`, calling services, returning `c.json(...)`). **No Drizzle imports. No `try/catch` for domain errors.**
   - `services/`: Business rules & orchestration only. **No `hono` imports. Never accept `Context` (`c`) or raw `c.env`.** Accept typed repository interfaces and plain config objects; throw catalog `AppError`s.
   - `repositories/`: Drizzle queries only. **No business rules, no HTTP errors.** Return rows or `null`; let services decide whether `null` throws a `NotFound` error.
   - `utils/`: Pure stateless functions only. **No `Database`, no Drizzle, no `hono`.**
3. **Reuse `@niwa/api-core` — do not duplicate core boilerplate**:
   - Always import `AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler`, `validate`, `createDbMiddleware`, `createRbacMiddlewares`, and `createOriginCorsMiddleware` from `@niwa/api-core`.
   - Use `createOriginCorsMiddleware()` configured with `ALLOWED_ORIGINS` in `wrangler.jsonc` (never wide-open `cors()`).
4. **DI strategy (Per-route / domain factory helper)**:
   - Use Factory DI (`createXRepo(db)` → `createXService({ ...repos, config })`).
   - Attach `db` once per request in `middlewares/db.ts`.
   - Wire only the repos/service needed inside each route file via a local helper (e.g., `getRoleService(c)`). Do **not** eagerly instantiate all services in a global container middleware.
5. **Cloudflare Workers + D1 rules**:
   - Never instantiate Drizzle at module scope; D1 bindings only exist per request on `c.env.DB`.
   - D1 does **not** support interactive `db.transaction(...)`; use `db.batch([...])` for atomic multi-statement writes.
   - Generate migrations via `pnpm db:generate` from `src/db/schema.ts`; never hand-edit migration SQL.
   - Avoid running idempotent seed inserts on every request (memoize per isolate or run via migrations).
6. **Standard REST Error Contract**:
   All errors (domain errors, auth/RBAC middleware errors, Zod validation errors, 404s, 500s) must flow through `@niwa/api-core`'s `errorHandler`/`notFoundHandler` and return the flat JSON shape:
   ```json
   {
     "error": "Conflict",
     "code": "DOMAIN_SPECIFIC_CODE",
     "message": "Human-readable explanation",
     "details": []
   }
   ```
   (`details` is omitted unless structured validation/context metadata exists.)
7. **Sub-resource route splitting**:
   Split multi-entity domains into sub-resources (`apps`, `roles`, `permissions`, `users`) across `repositories/`, `services/`, and `routes/<domain>/` while preserving clean REST paths via domain aggregator routers (`routes/<domain>/index.ts`).

## 4. Workflow: Adding or Refactoring an Endpoint

When implementing or refactoring code, read [references/patterns.md](./references/patterns.md) once for exact TypeScript templates, then follow this order:

1. **Schema (`src/db/schema.ts`)**: Add/update Drizzle tables if needed and run `pnpm db:generate`.
2. **Error Catalog (`src/errors/<domain>.ts`)**: Define semantic error codes & factories using `AppError` from `@niwa/api-core/errors`.
3. **Validator (`src/validators/<domain>.ts`)**: Add or re-export Zod schemas (shared schemas live in `packages/validators/*`).
4. **Repository (`src/repositories/<resource>.ts`)**: Implement `create<Resource>Repo(db)` with typed Drizzle queries and exported `type <Resource>Repo = ReturnType<typeof create<Resource>Repo>`.
5. **Service (`src/services/<resource>.ts`)**: Implement `create<Resource>Service(deps)` using repo interfaces, pure `utils/`, and catalog errors.
6. **Route (`src/routes/<domain>/<resource>.ts`)**: Wire deps via a local per-route helper, attach `validate(...)` + middlewares, call the service, and return `c.json(...)`.
7. **Mount (`src/routes/<domain>/index.ts` & `src/index.ts`)**: Mount sub-resource routes and verify middleware order (`createOriginCorsMiddleware` → `dbMiddleware` → `authMiddleware`).

## 5. Verification Checklist

Before finishing any API task:
1. Run `pnpm typecheck` in the target API directory (e.g., `pnpm --filter @niwa/auth-api typecheck`).
2. Confirm **zero** Drizzle imports inside `src/routes/` and `src/services/` (except type-only imports if unavoidable) and **zero** `hono` imports inside `src/services/`, `src/repositories/`, and `src/utils/`.
3. Confirm all error paths throw `AppError` from `@niwa/api-core/errors` (no ad-hoc `c.json({ error: ... }, 4xx)` scattered in routes/middlewares).
4. Confirm request validation uses `validate(...)` from `@niwa/api-core/validators` (re-exported via `src/validators/index.ts`) so Zod errors match `{ error, code, message, details }`.
