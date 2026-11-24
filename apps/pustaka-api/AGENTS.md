# Pustaka API — Agent Context (`@niwa/pustaka-api`)

## 1. Project Overview
**"Pustaka"** (`@niwa/pustaka-api`, Worker: `niwa-pustaka-api`) is a personal and household mini-library, shared libraries, and reading progress tracking API within the `niwa` monorepo on Cloudflare Workers, D1, and R2.

User identity, authentication, and multi-app RBAC are delegated to **`@niwa/auth-api`** (`niwa-auth-api`). `@niwa/pustaka-api` verifies ES256 JWTs statelessly at the edge via **`@niwa/auth/server`** (JWKS cached from Service Binding `AUTH_API` or `AUTH_API_URL`), reading `app_roles["pustaka"]` and `app_permissions["pustaka"]`, and stores only library/reading domain tables in `pustaka-db`.

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (`wrangler.jsonc`, dev port `8787`, `pnpm dev:pustaka`)
- **Framework**: Hono v4 built on `@niwa/api-core` (`AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler`, `validate()`, `createDbMiddleware()`, `createRbacMiddlewares()`, `createOriginCorsMiddleware()`)
- **Identity & RBAC**: `@niwa/auth/server` (ES256 JWKS verification, `audience: "pustaka"`) + Service Binding `AUTH_API` -> `niwa-auth-api`
- **Database**: Cloudflare D1 (`pustaka-db`) with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Object Storage**: Cloudflare R2 (`BUCKET` -> `pustaka-covers` for book cover storage and streaming)
- **Validation**: Zod v4 schemas in `packages/validators/pustaka` (`@niwa/pustaka-validators`)
- **Architecture Reference**: Follow `.agents/skills/niwa-api-architecture/SKILL.md` (`routes → services → repositories → db`).

## 3. Actors & Domain Modules (`/api/v1`)
- **Roles**: `admin` (full inventory, bookshelves, covers, user/role management) and `member` (personal/shared libraries, reading lists, reading progress, reviews).
- **Routes Mounted (`src/index.ts`)**:
  - `/api/v1/auth` & `/api/v1/users`: Auth proxy to `@niwa/auth-api`, user profile, admin user/role management
  - `/api/v1/libraries` & `/api/v1/invites`: Shared household libraries, membership management, invite links
  - `/api/v1/bookshelves` & `/api/v1/books`: Bookshelf & book catalog CRUD, R2 cover upload/streaming, book reviews
  - `/api/v1/me`: Personal owned books, reading lists, and page reading progress

## 4. Bindings & Conventions
- **Bindings (`src/types/env.ts`)**: `DB: D1Database`, `BUCKET: R2Bucket`, `AUTH_API?: Fetcher`, `AUTH_API_URL?: string`, `JWT_ISSUER?: string`, `ALLOWED_ORIGINS?: string`.
- **CORS**: Origin allowlist via `createOriginCorsMiddleware` (`ALLOWED_ORIGINS`, default `https://pustaka.hendrasadewa.com` + localhost in local dev).
- **Documentation**: Local `.docs/` (`PRD.md`, `PLAN.md`, gitignored).
- **Commit Convention**: `[feat|fix|chore](pustaka-api): [commit_message]`
