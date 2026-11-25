# niwa

> *Niwa* (庭 — garden) is a TypeScript & pnpm monorepo housing a collection of personal web products, edge APIs, interactive experiments, and shared platform packages targeting Cloudflare's serverless ecosystem.

- **Design System & UI Showcase (`@niwa/ui`):** [https://labs.hendrasadewa.com/demos/design-tokens](https://labs.hendrasadewa.com/demos/design-tokens)

---

## Table of Contents

- [Workspace Catalog](#workspace-catalog)
  - [Frontend Applications](#frontend-applications)
  - [Backend APIs](#backend-apis)
  - [Shared Packages](#shared-packages)
- [Architecture](#architecture)
  - [System & Package Dependencies](#system--package-dependencies)
  - [Repository Tree](#repository-tree)
  - [Backend API Layered Architecture](#backend-api-layered-architecture)
  - [Frontend Archetypes](#frontend-archetypes)
- [Design System (`@niwa/ui`)](#design-system-niwaui)
- [Tech Stack](#tech-stack)
- [Onboarding & Local Development](#onboarding--local-development)
- [Contributing Guidelines](#contributing-guidelines)

---

## Workspace Catalog

### Frontend Applications

| App | Package | Type | Local Dev | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `apps/web` | `@niwa/web` | SSR Web (Next.js 16 + OpenNext) | `pnpm dev:web` (`:3000`) | Personal website ([hendrasadewa.com](https://hendrasadewa.com)) |
| `apps/pustaka-web` | `@niwa/pustaka-web` | SSR Web (Next.js 16 + OpenNext) | `pnpm dev:pustaka-web` (`:3001`) | Personal & household library and reading tracker ([pustaka.hendrasadewa.com](https://pustaka.hendrasadewa.com)) |
| `apps/open-po-webapp` | `@niwa/open-po-webapp` | SSR Web (Next.js 16 + OpenNext) | `pnpm dev:open-po-web` (`:3002`) | Pre-order storefront & seller console ([preorder.hendrasadewa.com](https://preorder.hendrasadewa.com)) |
| `apps/auth-web` | `@niwa/auth-web` | SPA (Vite 8 + React Router v8) | `pnpm dev:auth-web` (`:3003`) | Hosted Identity Provider portal: SSO login, passkeys, consent, account & ACL ([auth.hendrasadewa.com](https://auth.hendrasadewa.com)) |
| `apps/labs` | `@niwa/labs` | SPA (Vite 8 + React Router v8) | `pnpm dev:labs` (`:5173`) | Interactive experiments, SQLite WASM, barcode scanner & `@niwa/ui` showcase ([labs.hendrasadewa.com](https://labs.hendrasadewa.com)) |

### Backend APIs

| App | Package | Runtime & Storage | Local Dev | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `apps/auth-api` | `@niwa/auth-api` | Hono v4 + Drizzle + D1 | `pnpm dev:auth` (`:8788`) | Reference API — standalone IdP, ES256 JWKS JWT issuer, SSO sessions, WebAuthn/Passkeys, multi-app RBAC/ACL |
| `apps/pustaka-api` | `@niwa/pustaka-api` | Hono v4 + Drizzle + D1 + R2 | `pnpm dev:pustaka` (`:8787`) | Library catalog, shared household libraries, invites, reading progress, reviews & cover storage |
| `apps/open-po-api` | `@niwa/open-po-api` | Hono v4 + Drizzle + D1 + R2 | `pnpm dev:open-po` (`:8789`) | Stores, product catalogs, pre-order waves, checkout, Kanban fulfillment, public tracking & media storage |
| `apps/web-api` | `@niwa/web-api` | Hono v4 + Drizzle + D1 | `pnpm dev:api` (`:8790`) | Personal website API (minimal stub — deferred until domain endpoints are designed) |

### Shared Packages

| Directory | Package | Role |
| :--- | :--- | :--- |
| `packages/api-core` | `@niwa/api-core` | Shared Hono v4 / Zod v4 backend primitives: `AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler`, `validate()`, `createDbMiddleware()`, `createRbacMiddlewares()`, and `createOriginCorsMiddleware()` |
| `packages/auth` | `@niwa/auth` | Shared first-party SSO client (`./client`), React provider & hooks (`./react`), edge ES256 JWKS verifier (`./server`), and JWT types (`./types`) |
| `packages/api-client` | `@niwa/api-client` | Shared typed Fetch client (`createApiClient`, `ApiError`) with automatic `401` token refresh & retry |
| `packages/ui` | `@niwa/ui` | Shared design tokens, zero-dependency core components (`./components`), Radix interactive primitives (`./primitives`), hooks (`./hooks`), and `cn()` utility (`./utils`) — [Live Showcase](https://labs.hendrasadewa.com/demos/design-tokens) |
| `packages/validators/auth` | `@niwa/auth-validators` | Shared Zod v4 request/form schemas for Auth, SSO & ACL |
| `packages/validators/open-po` | `@niwa/open-po-validators` | Shared Zod v4 schemas for Open-PO stores, products, waves, orders & reviews |
| `packages/validators/pustaka` | `@niwa/pustaka-validators` | Shared Zod v4 schemas for Pustaka books, shelves, libraries, reading progress & reviews |

---

## Architecture

### System & Package Dependencies

```text
Runtime Request & SSO Flow
──────────────────────────
Browser
 ├── auth.hendrasadewa.com     (auth-web)        ──▶ auth-api (IdP / ES256 JWKS / __Host-niwa_session)
 ├── pustaka.hendrasadewa.com  (pustaka-web)     ──▶ pustaka-api ──(Service Binding / JWKS)──▶ auth-api
 ├── preorder.hendrasadewa.com (open-po-webapp)  ──▶ open-po-api ──(Service Binding / JWKS)──▶ auth-api
 ├── labs.hendrasadewa.com     (labs)            ──▶ Client-only experiments & @niwa/ui showcase
 └── hendrasadewa.com          (web)             ──▶ web-api (stub)

Workspace Dependency Map
────────────────────────
Backend APIs
 ├── auth-api        ──▶ @niwa/api-core, @niwa/auth-validators
 ├── open-po-api     ──▶ @niwa/api-core, @niwa/auth/server, @niwa/open-po-validators
 ├── pustaka-api     ──▶ @niwa/api-core, @niwa/auth/server, @niwa/pustaka-validators
 └── web-api         ──▶ (deferred stub)

Frontend Apps (SSR Web — Next.js 16 + OpenNext)
 ├── open-po-webapp  ──▶ @niwa/ui, @niwa/auth, @niwa/api-client, @niwa/open-po-validators
 ├── pustaka-web     ──▶ @niwa/ui, @niwa/auth, @niwa/api-client, @niwa/pustaka-validators
 └── web             ──▶ (personal site)

Frontend Apps (SPA — Vite 8 + React Router v8)
 ├── auth-web        ──▶ @niwa/ui, @niwa/auth-validators
 └── labs            ──▶ @niwa/ui
```

### Repository Tree

```text
niwa/
├── pnpm-workspace.yaml           # Workspace globs + shared dependency catalogs
├── tsconfig.base.json            # Shared strict TypeScript compiler options
├── package.json                  # Root dev, typecheck, build, and deploy scripts
├── .github/workflows/deploy.yml  # Path-filtered Cloudflare deployment pipeline
├── docs/architecture/            # Cross-cutting architecture docs (e.g. SSO / IdP)
├── apps/
│   ├── auth-api/                 # Reference 9-layer Hono + Drizzle + D1 API
│   ├── auth-web/                 # Vite SPA — Hosted IdP portal
│   ├── open-po-api/              # Hono + Drizzle + D1 + R2 commerce API
│   ├── open-po-webapp/           # Next.js 16 + OpenNext storefront & seller app
│   ├── pustaka-api/              # Hono + Drizzle + D1 + R2 library API
│   ├── pustaka-web/              # Next.js 16 + OpenNext library web app
│   ├── web-api/                  # Personal site API (stub)
│   ├── web/                      # Next.js 16 + OpenNext personal site
│   └── labs/                     # Vite SPA — Experiments & @niwa/ui showcase
└── packages/
    ├── api-core/                 # @niwa/api-core — Shared Hono errors, validate, DB, RBAC, CORS
    ├── api-client/               # @niwa/api-client — Typed Fetch client with 401 refresh retry
    ├── auth/                     # @niwa/auth — SSO browser client, React hooks, JWKS verifier
    ├── ui/                       # @niwa/ui — Design tokens, core components & Radix primitives
    └── validators/
        ├── auth/                 # @niwa/auth-validators
        ├── open-po/              # @niwa/open-po-validators
        └── pustaka/              # @niwa/pustaka-validators
```

### Backend API Layered Architecture

All production APIs (`auth-api`, `open-po-api`, `pustaka-api`) enforce a strict **one-way layered architecture** built on `@niwa/api-core`:

```text
index.ts ──▶ middlewares / routes ──▶ services ──▶ repositories ──▶ db
```

```text
apps/<product>-api/
├── wrangler.jsonc            # Cloudflare Workers config (D1, R2, Service Bindings, ALLOWED_ORIGINS)
├── drizzle.config.ts
├── drizzle/                  # Auto-generated SQL migrations (`pnpm db:generate`)
└── src/
    ├── index.ts              # Hono app wiring: origin CORS, dbMiddleware, errorHandler, /api/v1/* routes
    ├── types/                # Hono AppEnv (Bindings/Variables) & domain DTOs
    ├── db/                   # Per-request createDb(d1) factory, schema.ts, optional seed.ts
    ├── errors/               # Domain error catalogs (re-exporting @niwa/api-core/errors)
    ├── middlewares/          # db.ts, auth.ts (ES256 JWKS), rbac.ts (via @niwa/api-core/middlewares)
    ├── validators/           # Re-export of validate() + domain @niwa/*-validators schemas
    ├── repositories/         # Drizzle queries only — create<Resource>Repo(db) (zero HTTP/business rules)
    ├── services/             # Pure business logic — create<Resource>Service(deps) (zero Hono/Drizzle)
    ├── routes/               # Thin HTTP handlers with lazy per-route DI helpers (zero Drizzle)
    └── utils/                # Pure stateless helpers (zero DB, zero Hono)
```

- **Standard Error Contract:** All errors (domain errors, auth/RBAC errors, Zod validation errors, 404s, 500s) flow through `@niwa/api-core`'s `errorHandler` and return `{ error, code, message, details? }`.
- **Edge Auth & SSO:** `auth-api` issues short-lived ES256 JWTs signed with asymmetric keys published at `/.well-known/jwks.json`. Downstream APIs verify tokens statelessly via `@niwa/auth/server` using Cloudflare Service Bindings (or HTTP in local dev).
- **D1 Atomicity:** Because Cloudflare D1 does not support interactive `db.transaction(...)`, multi-statement atomic writes use `db.batch([...])`.

### Frontend Archetypes

This monorepo intentionally maintains two frontend archetypes depending on rendering needs:

1. **SSR Web — Next.js 16 App Router + OpenNext (`@opennextjs/cloudflare`)**
   - Used for SEO/SSR product web apps (`web`, `pustaka-web`, `open-po-webapp`).
   - Standard `src/` layout: `app/`, `components/{layout,<domain>}/`, `providers/` (`auth-provider`, `query-provider`), `lib/` (`api.ts`, `sso.ts`, `utils.ts`), `types/`, `middleware.ts`.
2. **SPA — Vite 8 + React Router v8 (Cloudflare Static Assets)**
   - Used for lightweight client-only portals and interactive demos (`auth-web`, `labs`) deployed with `not_found_handling: "single-page-application"`.

---

## Design System (`@niwa/ui`)

Browse every token, color palette, typography scale, brand accent, and interactive component live in the showcase:

**[https://labs.hendrasadewa.com/demos/design-tokens](https://labs.hendrasadewa.com/demos/design-tokens)**

`@niwa/ui` is consumed directly as source TypeScript across all frontends with Tailwind CSS v4:

- **`@niwa/ui/styles/tokens.css` & `@niwa/ui/tokens`** — Calm botanical design tokens with light/dark mode and product brand scopes (`default` Botanical Sage, `data-brand="auth"` Terracotta, `data-brand="preorder"` Waterlily Pink).
- **`@niwa/ui/components`** — Lightweight, zero-Radix core primitives (`Button`, `Card`, `DataTable`, `PageHeader`, `ColorSchemeToggle`, `Spinner`, `EmptyState`, `Alert`, `FormField`, etc.).
- **`@niwa/ui/primitives`** — Shared Radix UI compound primitives (`Dialog`, `DropdownMenu`, `Select`, `Form`, `Table`, `Toast`, `Toaster`, `Input`, `Label`, `Badge`, `Button`, `Card`, `Textarea`, `Progress`, `Skeleton`).
- **`@niwa/ui/hooks`** — Shared React hooks (`useToast`, `toast`).
- **`@niwa/ui/utils`** — `cn()` helper powered by `clsx` + `tailwind-merge`.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Package Management** | `pnpm@10.32.1` workspaces with centralized `catalog:` / `catalogs:` version management |
| **Language** | TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) |
| **Infrastructure** | Cloudflare Workers, D1 (SQLite), R2 (Object Storage), Static Assets, Service Bindings, Wrangler v4 (`wrangler.jsonc`) |
| **Backend APIs** | Hono v4, Drizzle ORM + Drizzle Kit, Zod v4 (`@hono/zod-validator`), `jose` (ES256 JWKS), `@simplewebauthn/server` |
| **Frontend (SSR)** | Next.js 16 (App Router, Turbopack), React 19, `@opennextjs/cloudflare` |
| **Frontend (SPA)** | Vite 8, React 19, React Router v8 |
| **UI & Styling** | Tailwind CSS v4, `@niwa/ui`, Radix UI primitives, `lucide-react`, `class-variance-authority` |
| **Client State & Forms** | TanStack Query v5, React Hook Form + `@hookform/resolvers/zod` |
| **CI/CD** | GitHub Actions (`dorny/paths-filter`) running `typecheck`, D1 migrations, and Wrangler/OpenNext deploys per changed app |

---

## Onboarding & Local Development

### 1. Prerequisites

- **Node.js** `>= 22` (CI runs Node 22)
- **pnpm** `10.32.1` (enable via `corepack enable` or install globally)
- **Cloudflare account / Wrangler** only required if you plan to deploy; local D1 and R2 work offline via Wrangler's local emulator.

### 2. Clone & Install

```bash
git clone https://github.com/hendrasadewa/niwa.git
cd niwa
pnpm install
```

### 3. Configure Local Environment Variables

Every app ships with an example environment file—**never commit real secrets, `.dev.vars`, or `.env.local` files**:

- **Backend APIs (`apps/*-api`):** Copy `.dev.vars.example` to `.dev.vars` inside each API you want to run and fill in local-only values (for `auth-api`, generate your own local ES256 JWK keypair and leave `RESEND_API_KEY` unset to log verification/reset links to the terminal).
  ```bash
  cp apps/auth-api/.dev.vars.example apps/auth-api/.dev.vars
  cp apps/open-po-api/.dev.vars.example apps/open-po-api/.dev.vars
  cp apps/pustaka-api/.dev.vars.example apps/pustaka-api/.dev.vars
  ```
- **Frontend Apps (`apps/*-web*`, `apps/labs`):** Copy `.env.example` to `.env.local` (Next.js) or `.env` (Vite) and point API URLs to your local ports.
  ```bash
  cp apps/auth-web/.env.example apps/auth-web/.env
  cp apps/pustaka-web/.env.example apps/pustaka-web/.env.local
  cp apps/open-po-webapp/.env.example apps/open-po-webapp/.env.local
  cp apps/labs/.env.example apps/labs/.env
  ```

> **Local Cookie Tip:** Always access local apps via `http://localhost:<port>` rather than `http://127.0.0.1:<port>` so `SameSite=Lax` IdP session cookies work consistently across local ports.

### 4. Apply Local D1 Database Migrations

Run local Drizzle/Wrangler migrations for each API you intend to develop against:

```bash
pnpm --filter @niwa/auth-api db:migrate:local
pnpm --filter @niwa/pustaka-api db:migrate:local
pnpm --filter @niwa/open-po-api db:migrate:local
```

### 5. Start Services Locally

For apps that use SSO authentication (`pustaka`, `open-po`), run `auth-api` and `auth-web` alongside the product's API and web app in separate terminals:

```bash
# Core Identity Provider (required for SSO login flows)
pnpm dev:auth          # auth-api     → http://localhost:8788
pnpm dev:auth-web      # auth-web     → http://localhost:3003

# Pustaka
pnpm dev:pustaka       # pustaka-api  → http://localhost:8787
pnpm dev:pustaka-web   # pustaka-web  → http://localhost:3001

# Open-PO
pnpm dev:open-po       # open-po-api    → http://localhost:8789
pnpm dev:open-po-web   # open-po-webapp → http://localhost:3002

# Standalone / Experiments
pnpm dev:labs          # labs         → http://localhost:5173
pnpm dev:web           # web          → http://localhost:3000
```

### 6. Verification Commands

Run these before opening a PR or committing:

```bash
pnpm typecheck                 # Typecheck all active apps & shared packages
pnpm build                     # Production build for all frontend apps
pnpm -r --if-present lint      # Lint all configured apps
```

---

## Contributing Guidelines

1. **Follow Naming & Config Conventions**
   - New products use `apps/<product>-api` (`@niwa/<product>-api`), `apps/<product>-web` (`@niwa/<product>-web`), and `packages/validators/<product>` (`@niwa/<product>-validators`). *(Note: `apps/open-po-webapp` keeps its legacy name to avoid live Worker churn.)*
   - Use `wrangler.jsonc` for all Cloudflare Worker configs.
   - Use `"catalog:"` in `package.json` for dependencies listed in `pnpm-workspace.yaml`, and never commit nested `pnpm-lock.yaml` or `pnpm-workspace.yaml` files inside sub-apps.
2. **Respect Backend Layer Isolation**
   - Build new API endpoints following `routes → services → repositories → db` using `@niwa/api-core`.
   - Keep `routes/` free of Drizzle imports, `services/` free of Hono/Drizzle imports, and `utils/` pure.
   - Generate D1 migrations via `pnpm --filter @niwa/<api> db:generate` from `src/db/schema.ts` rather than hand-editing SQL files.
   - Always configure origin-allowlist CORS via `createOriginCorsMiddleware()` + `ALLOWED_ORIGINS` (never wide-open `cors()`).
3. **Keep UI Primitives Centralized in `@niwa/ui`**
   - Do not copy shadcn `components/ui/*` files into individual apps. Import from `@niwa/ui/primitives`, `@niwa/ui/components`, and `@niwa/ui/hooks`, or add new shared primitives to `packages/ui`.
4. **Keep CI Path Filters in Sync**
   - If you add a new shared package or wire an existing package into an app, update `.github/workflows/deploy.yml` so changes trigger the right app deployments.
5. **Security & Privacy**
   - Never commit secrets, API keys, private JWKs, `.dev.vars`, `.env.local`, or personal/customer PII. Use Wrangler secrets (`wrangler secret put`) for production credentials.
