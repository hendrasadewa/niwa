# AGENTS.md

This file provides guidance to AI coding agents working in the `niwa` monorepo ("A garden of code, collection of Hendra Sadewa's personal web products").

## Repository Overview & Architecture

`niwa` is a TypeScript & pnpm monorepo targeting Cloudflare Workers/Pages across its applications, with a shared UI library.

### Workspace Structure

- **`apps/web` (`@niwa/web`)**
  - **Purpose**: Hendra Sadewa's personal website (`https://hendrasadewa.com`).
  - **Stack**: Next.js 16 (App Router, `src/app`), React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), deployed to Cloudflare Workers via `@opennextjs/cloudflare` (`niwa-web`).
  - **Config**: Transpiles `@niwa/ui` in `next.config.ts`; initializes OpenNext Cloudflare dev bindings via `initOpenNextCloudflareForDev()`.
  - **Note**: Next.js 16 includes agent rules in `apps/web/AGENTS.md`—consult `apps/web/node_modules/next/dist/docs/` for Next.js 16 API changes.

- **`apps/web-api` (`@niwa/web-api`)**
  - **Purpose**: REST API service (`niwa-web-api`).
  - **Stack**: Hono v4 on Cloudflare Workers (`src/index.ts`), Cloudflare D1 SQLite database (`DB` binding -> `niwa-db`), Drizzle ORM (`src/db/schema.ts`, migrations output to `./drizzle`).

- **`apps/labs` (`@niwa/labs`)**
  - **Purpose**: Interactive experiments, demos, and prototypes (`niwa-labs`).
  - **Stack**: Vite 8 + React 19 SPA, React Router v8 (`createBrowserRouter` in `src/main.tsx`), Tailwind CSS v4 (`@tailwindcss/vite`), deployed as static SPA assets via Cloudflare Wrangler (`not_found_handling: "single-page-application"`).

- **`packages/ui` (`@niwa/ui`)**
  - **Purpose**: Shared React 19 UI library consumed as source TypeScript (transpiled by consuming bundlers).
  - **Subpath Exports**:
    - `@niwa/ui/components` -> `./src/components/index.ts`
    - `@niwa/ui/hooks` -> `./src/hooks/index.ts`
    - `@niwa/ui/types` -> `./src/types/index.ts`
    - `@niwa/ui/utils` -> `./src/utils/index.ts`

## Package Management & Commands

- **Package Manager**: `pnpm@10.32.1`
- **Important Workspace Note**: Root `package.json` defines `pnpm --filter` and `pnpm -r` scripts, but if `pnpm-workspace.yaml` is not yet configured at the repository root, run package commands directly inside each app directory or add a root `pnpm-workspace.yaml` covering `apps/*` and `packages/*`.

### Root Commands (`package.json`)

```bash
pnpm dev:web       # Start @niwa/web Next.js dev server
pnpm dev:api       # Start @niwa/web-api Wrangler dev server
pnpm dev:labs      # Start @niwa/labs Vite dev server
pnpm build         # Run build across all workspace packages
pnpm typecheck     # Run typecheck across all workspace packages
```

### Per-App Commands

- **`apps/web` (`@niwa/web`)**:
  - `pnpm dev` — Run `next dev`
  - `pnpm build` — Run `next build`
  - `pnpm lint` — Run `eslint`
  - `pnpm preview` — Build and preview on Cloudflare runtime via `opennextjs-cloudflare`
  - `pnpm deploy` — Build and deploy to Cloudflare via `opennextjs-cloudflare`

- **`apps/web-api` (`@niwa/web-api`)**:
  - `pnpm dev` — Run `wrangler dev`
  - `pnpm deploy` — Run `wrangler deploy`
  - `pnpm db:generate` — Generate Drizzle SQLite migrations from `src/db/schema.ts`
  - `pnpm db:migrate:local` — Apply D1 migrations locally (`wrangler d1 migrations apply niwa-db --local`)
  - `pnpm db:migrate:remote` — Apply D1 migrations to remote D1 (`wrangler d1 migrations apply niwa-db --remote`)

- **`apps/labs` (`@niwa/labs`)**:
  - `pnpm dev` — Run `vite`
  - `pnpm build` — Run `tsc -b && vite build`
  - `pnpm lint` — Run `eslint .`
  - `pnpm preview` — Run `vite preview`
  - `pnpm deploy` — Run `vite build && wrangler deploy`

## Conventions & Guidelines

1. **TypeScript**:
   - Base compiler options live in [`tsconfig.base.json`](./tsconfig.base.json) (`strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "Bundler"`).
   - Path alias `@/*` maps to `./src/*` inside `apps/web`.
2. **Styling**:
   - Both `apps/web` and `apps/labs` use **Tailwind CSS v4** (`@import "tailwindcss";`). Avoid legacy Tailwind v3 configuration patterns (`tailwind.config.js`).
3. **Shared UI (`@niwa/ui`)**:
   - Export new shared components, hooks, types, or utilities from their respective barrel files in `packages/ui/src/{components,hooks,types,utils}/index.ts`.
4. **Database & API Architecture (`apps/*-api`)**:
   - All Cloudflare Workers APIs (`apps/auth-api`, `apps/open-po-api`, `apps/pustaka-api`, `apps/web-api`, and future `*-api` apps) follow the standard **Hono + Drizzle + D1** layered architecture (starting with `apps/auth-api` as the reference implementation).
   - **Standard `src/` layout**: `types/`, `db/`, `errors/`, `middlewares/`, `validators/`, `repositories/`, `services/`, `routes/` (split by sub-resources), and `utils/`.
   - **Strict one-way dependencies**: `routes` → `services` → `repositories` → `db` (`utils` is pure with zero DB/Hono imports; `services` has zero Hono imports; `routes` has zero Drizzle imports).
   - **Dependency Injection**: Instantiate Drizzle per request via `middlewares/db.ts` (`c.set("db", createDb(c.env.DB))`), and wire factory repos/services (`createXRepo(db)` → `createXService({ ...repos })`) via **per-route / domain factory helpers**.
   - **Validation & Errors**: Wrap `@hono/zod-validator` + Zod in `src/validators/` (re-exporting shared workspace schemas from `packages/validators/*` when present) and throw typed errors from the `src/errors/` catalog handled globally by `app.onError(...)` with the flat JSON contract `{ error, code, message, details? }`.
   - **D1 Migrations & Atomicity**: Define tables in `src/db/schema.ts`, generate migrations with `pnpm db:generate` (never hand-edit SQL), and use `db.batch([...])` instead of `db.transaction(...)` for atomic multi-statement writes on D1.
   - **Detailed Guide & Templates**: Activate the **`niwa-api-architecture`** skill (`.agents/skills/niwa-api-architecture/SKILL.md`) before reading, adding, or refactoring any `apps/*-api` service.
