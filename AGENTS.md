# AGENTS.md

This file provides guidance to AI coding agents working in the `niwa` monorepo ("A garden of code, collection of Hendra Sadewa's personal web products").

## Repository Overview & Architecture

`niwa` is a TypeScript & pnpm workspace monorepo targeting Cloudflare Workers, D1, R2, and Static Assets across all products, supported by shared workspace packages.

### Workspace Structure

#### Backend APIs (`apps/*-api` — Hono v4 + Drizzle ORM + Cloudflare D1)

- **`apps/auth-api` (`@niwa/auth-api`, Worker: `niwa-auth-api`, dev port `8788`)**
  - Reference implementation of the canonical Niwa layered API architecture.
  - Standalone Identity Provider (IdP), ES256 JWKS JWT issuer, SSO sessions (`__Host-niwa_session`), Passkeys/WebAuthn, email verification, and multi-app RBAC/ACL service.
- **`apps/open-po-api` (`@niwa/open-po-api`, Worker: `niwa-open-po-api`, dev port `8789`)**
  - Micro-ecommerce pre-order management API (stores, products, waves, checkout, Kanban fulfillment, public tracking, reviews) backed by D1 + R2 (`BUCKET`) + `@niwa/auth/server` + `@niwa/api-core`.
- **`apps/pustaka-api` (`@niwa/pustaka-api`, Worker: `niwa-pustaka-api`, dev port `8787`)**
  - Personal/household library, shared libraries/invites, reading lists, reading progress, and book reviews API backed by D1 + R2 (`BUCKET`) + `@niwa/auth/server` + `@niwa/api-core`.
- **`apps/blog-api` (`@niwa/blog-api`, Worker: `niwa-blog-api`, dev port `8791`)**
  - Personal ATProto (`standard.site`) blogging API (private D1 drafts, R2 inline media & PDS JSON cache, authenticated `site.standard.publication`/`document` & `app.bsky.feed.post` publisher) backed by D1 + R2 (`BUCKET`) + `@niwa/auth/server` + `@niwa/api-core`.
- **`apps/web-api` (`@niwa/web-api`, Worker: `niwa-web-api`, dev port `8790`)**
  - Personal website API (`api.hendrasadewa.com`), currently a minimal stub deferred until domain endpoints are designed.

#### Frontend Archetype A — Next.js 16 App Router + OpenNext (`@opennextjs/cloudflare`)

Used for SEO/SSR product web apps:
- **`apps/web` (`@niwa/web`, Worker: `niwa-web`, dev port `3000`)** — Personal website (`https://hendrasadewa.com`).
- **`apps/pustaka-web` (`@niwa/pustaka-web`, Worker: `niwa-pustaka-web`, dev port `3001`)** — Pustaka library web app (`https://pustaka.hendrasadewa.com`).
- **`apps/open-po-webapp` (`@niwa/open-po-webapp`, Worker: `niwa-open-po-webapp`, dev port `3002`)** — Open-PO storefront & seller console (`https://preorder.hendrasadewa.com`). *(Legacy `-webapp` name is intentionally preserved to avoid live Cloudflare Worker churn; all new products must use `<product>-web`.)*
- **`apps/blog-web` (`@niwa/blog-web`, Worker: `niwa-blog-web`, dev port `3004`)** — Personal ATProto (`standard.site`) semi-micro-blogging web app & Markdown Studio (`https://blog.hendrasadewa.com`).

*(Note: Next.js 16 includes agent rules inside each Next.js app's `AGENTS.md`—consult `apps/<app>/node_modules/next/dist/docs/` for Next.js 16 API changes.)*

#### Frontend Archetype B — Vite 8 + React Router v8 SPAs (Cloudflare Static Assets)

Used for lightweight client-only portals and interactive experiments (`not_found_handling: "single-page-application"`):
- **`apps/auth-web` (`@niwa/auth-web`, Worker: `niwa-auth-web`)** — Hosted Niwa Identity Provider portal (`https://auth.hendrasadewa.com`).
- **`apps/labs` (`@niwa/labs`, Worker: `niwa-labs`)** — Interactive experiments, demos, and design-token showcase (`https://labs.hendrasadewa.com`).

#### Shared Packages (`packages/*`)

- **`packages/api-core` (`@niwa/api-core`)** — Shared Hono v4 / Zod v4 backend primitives: `AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler`, `validate()`, `createDbMiddleware()`, `createRbacMiddlewares()`, and `createOriginCorsMiddleware()`.
- **`packages/auth` (`@niwa/auth`)** — Shared SSO client (`./client`), React provider/hooks (`./react`), ES256 JWKS verifier (`./server`), and JWT types (`./types`).
- **`packages/api-client` (`@niwa/api-client`)** — Shared typed Fetch API client (`createApiClient`, `ApiError`, automatic 401 refresh-retry).
- **`packages/ui` (`@niwa/ui`)** — Shared design tokens and React 19 UI library (consumed as source TypeScript):
  - `@niwa/ui/styles/tokens.css` & `@niwa/ui/tokens` — Calm botanical design tokens & brand themes
  - `@niwa/ui/components` — Lightweight, zero-Radix core primitives (`Button`, `Card`, `DataTable`, `PageHeader`, `Spinner`, `ColorSchemeToggle`, etc.)
  - `@niwa/ui/primitives` — Shared Radix UI / interactive compound primitives (`Dialog`, `DropdownMenu`, `Select`, `Form`, `Table`, `Toast`, `Toaster`, `Input`, `Label`, `Badge`, `Button`, `Card`, `Textarea`, `Progress`, `Skeleton`)
  - `@niwa/ui/hooks` — Shared React hooks (`useToast`, `toast`)
  - `@niwa/ui/utils` — `cn()` (`clsx` + `tailwind-merge`)
  - `@niwa/ui/types` — Shared UI types
- **`packages/validators/{auth,blog,open-po,pustaka}` (`@niwa/*-validators`)** — Domain Zod v4 validation schemas shared across each API and frontend.

---

## Package Management & Commands

- **Package Manager**: `pnpm@10.32.1`
- **Workspace & Catalogs**: Root `pnpm-workspace.yaml` covers `apps/*`, `packages/*`, and `packages/validators/*`, and defines shared `catalog:` / `catalogs:` version ranges. Always prefer `"catalog:"` for shared dependencies and never commit nested `pnpm-lock.yaml` or `pnpm-workspace.yaml` inside sub-apps.

### Root Commands (`package.json`)

```bash
pnpm dev:web          # @niwa/web (Next.js, port 3000)
pnpm dev:pustaka-web  # @niwa/pustaka-web (Next.js, port 3001)
pnpm dev:open-po-web  # @niwa/open-po-webapp (Next.js, port 3002)
pnpm dev:blog-web     # @niwa/blog-web (Next.js, port 3004)
pnpm dev:auth-web     # @niwa/auth-web (Vite SPA)
pnpm dev:labs         # @niwa/labs (Vite SPA)
pnpm dev:pustaka      # @niwa/pustaka-api (Wrangler, port 8787)
pnpm dev:auth         # @niwa/auth-api (Wrangler, port 8788)
pnpm dev:open-po      # @niwa/open-po-api (Wrangler, port 8789)
pnpm dev:api          # @niwa/web-api (Wrangler, port 8790)
pnpm dev:blog         # @niwa/blog-api (Wrangler, port 8791)
pnpm typecheck        # Run typecheck across all workspace packages
pnpm build            # Run build across all workspace packages
pnpm deploy:<app>     # Deploy individual apps via Wrangler / OpenNext
```

### Per-App Commands

- **Next.js apps (`web`, `open-po-webapp`, `pustaka-web`)**: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm preview`, `pnpm deploy`
- **Vite SPA apps (`auth-web`, `labs`)**: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm preview`, `pnpm deploy` (`pnpm lint` in `labs`)
- **Backend APIs (`auth-api`, `open-po-api`, `pustaka-api`, `web-api`)**: `pnpm dev`, `pnpm typecheck`, `pnpm deploy`, `pnpm db:generate`, `pnpm db:migrate:local`, `pnpm db:migrate:remote`

---

## Conventions & Guidelines

1. **Naming & Config Standardization**:
   - New products must follow `apps/<product>-api` (`@niwa/<product>-api`) and `apps/<product>-web` (`@niwa/<product>-web`), with shared schemas in `packages/validators/<product>` (`@niwa/<product>-validators`).
   - All Cloudflare apps use **`wrangler.jsonc`** (not `wrangler.toml`).
   - Per-app agent context lives in `AGENTS.md` (preserving the Next.js `<!-- BEGIN:nextjs-agent-rules -->` block in Next.js apps).
2. **TypeScript**:
   - Base compiler options live in [`tsconfig.base.json`](./tsconfig.base.json) (`strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "Bundler"`).
   - Path alias `@/*` maps to `./src/*` inside Next.js apps.
   - Every active app and package must expose a `typecheck` script so root `pnpm typecheck` and GitHub Actions validate it.
3. **Styling & Shared UI (`@niwa/ui`)**:
   - All frontends use **Tailwind CSS v4** (`@import "tailwindcss";` + `@import "@niwa/ui/styles/tokens.css";`). Avoid legacy Tailwind v3 config patterns.
   - **Do not duplicate shadcn `components/ui/*` files inside apps.** Consume shared Radix/interactive primitives from `@niwa/ui/primitives`, lightweight components from `@niwa/ui/components`, and `useToast`/`toast` from `@niwa/ui/hooks`. Add new shared primitives to `packages/ui` instead of copying them into apps.
4. **Database & API Architecture (`apps/*-api`)**:
   - All Cloudflare Workers APIs follow the canonical **Hono v4 + Drizzle + D1** layered architecture (`apps/auth-api` is the reference implementation) built on **`@niwa/api-core`**:
     - **Standard `src/` layout**: `types/`, `db/`, `errors/` (domain catalogs re-exporting `@niwa/api-core/errors`), `middlewares/` (`db.ts`, `auth.ts`, `rbac.ts`), `validators/` (re-exporting `validate` from `@niwa/api-core/validators` + `@niwa/*-validators`), `repositories/`, `services/`, `routes/` (split by sub-resources), and `utils/`.
     - **Strict one-way dependencies**: `routes` → `services` → `repositories` → `db` (`utils` has zero DB/Hono imports; `services` has zero Hono/Drizzle imports; `routes` has zero Drizzle imports).
     - **Shared Core & Security**: Reuse `AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler`, `validate()`, `createDbMiddleware()`, `createRbacMiddlewares()`, and `createOriginCorsMiddleware()` from `@niwa/api-core`. Configure `ALLOWED_ORIGINS` in `wrangler.jsonc` instead of open `cors()`.
     - **Dependency Injection**: Instantiate Drizzle per request via `middlewares/db.ts` and wire repos/services lazily inside per-route factory helpers (`getXService(c)`).
     - **D1 Migrations & Atomicity**: Define tables in `src/db/schema.ts`, generate migrations with `pnpm db:generate` (never hand-edit SQL), and use `db.batch([...])` instead of `db.transaction(...)`.
     - **Detailed Guide & Templates**: Activate the **`niwa-api-architecture`** skill (`.agents/skills/niwa-api-architecture/SKILL.md`) before reading, adding, or refactoring any `apps/*-api` service.
5. **CI/CD (`.github/workflows/deploy.yml`)**:
   - When adding a new shared package or wiring an existing one into an app, update the `dorny/paths-filter` rules in `.github/workflows/deploy.yml` so changes to shared packages trigger dependent app deployments.
