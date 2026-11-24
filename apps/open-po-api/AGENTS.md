# Open-PO API — Agent Context (`@niwa/open-po-api`)

## 1. Project Overview
**"Open-PO"** (`@niwa/open-po-api`, Worker: `niwa-open-po-api`) is a micro-ecommerce pre-order management API built for UMKM sellers and customers within the `niwa` monorepo on Cloudflare Workers, D1, and R2.

User identity, authentication, and multi-app RBAC are delegated to **`@niwa/auth-api`** (`niwa-auth-api`). `@niwa/open-po-api` verifies ES256 JWTs statelessly at the edge via **`@niwa/auth/server`** (JWKS cached from Service Binding `AUTH_API` or `AUTH_API_URL`), and stores only ecommerce-specific user metadata (`customer_profiles`) and denormalized order/review customer snapshots in `open-po-db`.

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (`wrangler.jsonc`, dev port `8789`, `pnpm dev:open-po`)
- **Framework**: Hono v4 built on `@niwa/api-core` (`AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler`, `validate()`, `createDbMiddleware()`, `createRbacMiddlewares()`, `createOriginCorsMiddleware()`)
- **Identity & RBAC**: `@niwa/auth/server` (ES256 JWKS verification, `audience: "open-po"`, `app_roles["open-po"]`, `app_permissions["open-po"]`) + Service Binding `AUTH_API` -> `niwa-auth-api`
- **Database**: Cloudflare D1 (`open-po-db`) with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Object Storage**: Cloudflare R2 (`BUCKET` -> `open-po-media` for store logos, product images, and payment receipts)
- **Validation**: Zod v4 schemas in `packages/validators/open-po` (`@niwa/open-po-validators`)
- **Architecture Reference**: Follow `.agents/skills/niwa-api-architecture/SKILL.md` (`routes → services → repositories → db`).

## 3. Actors & Domain Modules (`/api/v1`)
- **Roles**: `admin` (global), `seller` (owns stores/products/waves/Kanban orders), `member` (profile, order history, reviews), Guest (public catalog, guest checkout, masked tracking).
- **Routes Mounted (`src/index.ts`)**:
  - `/api/v1/auth` & `/api/v1/me`: Auth proxy to `@niwa/auth-api`, customer profile, owned stores, member order history
  - `/api/v1/stores`: Store CRUD, R2 logos, active waves lookup
  - `/api/v1/products`: Master catalog CRUD, archiving, R2 product images, product reviews
  - `/api/v1/waves`: Pre-order wave lifecycle (`Draft` → `Active` → `Closed`) and locked-price/quota product snapshots
  - `/api/v1/orders` & `/api/v1/track`: Member/Guest checkout, phone lookup with PII masking, Kanban order fulfillment, R2 receipts, delivery confirmation
  - `/api/v1/reviews`: Post-delivery 1–5 star product reviews

## 4. Bindings & Conventions
- **Bindings (`src/types/env.ts`)**: `DB: D1Database`, `BUCKET: R2Bucket`, `AUTH_API?: Fetcher`, `AUTH_API_URL?: string`, `JWT_ISSUER?: string`, `ALLOWED_ORIGINS?: string`.
- **CORS**: Origin allowlist via `createOriginCorsMiddleware` (`ALLOWED_ORIGINS`, default `https://preorder.hendrasadewa.com` + localhost in local dev).
- **Documentation**: Local `.docs/` (`PRD.md`, `PLAN.md`, `AUTH_SEPARATION_PLAN.md`, gitignored).
- **Commit Convention**: `[feat|fix|chore](open-po-api): [commit_message]`
