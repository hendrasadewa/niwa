# Pustaka API — Agent Context (`agent.md`)

## 1. Project Overview
**"Pustaka"** (`@niwa/pustaka-api`) is a self-hosted, lightweight mini-library and reading progress tracking API designed for personal and household use within the `niwa` monorepo, targeting Cloudflare's serverless edge ecosystem.

User identity, authentication, rotating refresh tokens, and multi-app RBAC are delegated to the standalone **`@niwa/auth-api`** (`niwa-auth-api`) service. `@niwa/pustaka-api` verifies HS256 `NiwaJwtPayload` tokens statelessly at the edge using the shared `JWT_SECRET` (reading `app_roles["pustaka"]` and `app_permissions["pustaka"]`), and stores only library/reading domain tables in `pustaka-db`.

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API `crypto.randomUUID()`)
- **Framework**: Hono v4 (`hono`, `hono/jwt`, `@hono/zod-validator`)
- **Identity & RBAC Service**: `@niwa/auth-api` (`niwa-auth-api`), called via Cloudflare Service Binding (`AUTH_API`) or `AUTH_API_URL` (`http://127.0.0.1:8788` in local dev)
- **Database**: Cloudflare D1 (Serverless SQLite, `pustaka-db`) with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Object Storage**: Cloudflare R2 (`BUCKET` -> `pustaka-covers` for book cover image storage and streaming)
- **Validation**: Zod v4 schemas housed in `packages/validators/pustaka` (`@niwa/pustaka-validators`)
- **Language**: TypeScript (extending root `tsconfig.base.json` with `strict: true`)

## 3. Monorepo Structure & Workspace Requirements
- **API Application**: `apps/pustaka-api` (`@niwa/pustaka-api`, local dev port `8787`)
- **Identity Service**: `apps/auth-api` (`@niwa/auth-api`, local dev port `8788`)
- **Shared Validation**: `packages/validators/pustaka` (`@niwa/pustaka-validators`), linked in `apps/pustaka-api/package.json` via `"@niwa/pustaka-validators": "workspace:*"`
- **Documentation**: Stored locally in `apps/pustaka-api/.docs/` (`PRD.md` and `PLAN.md`), ignored by Git via `.gitignore`.

## 4. Actors & Edge-Compatible RBAC
Roles and permissions are read from `app_roles["pustaka"]` and `app_permissions["pustaka"]` in the verified `NiwaJwtPayload`:
- **Admin (`admin`)**: Full privileges over book inventory, bookshelf locations, cover uploads, user listing, and role assignments (`inventory:read`, `inventory:write`, `reading:manage`, `reviews:write`, `users:manage`).
- **Member (`member`)**: View inventory, manage personal reading lists, update reading progress, and add book reviews (`inventory:read`, `reading:manage`, `reviews:write`).
- **Cross-App SSO Auto-Enrollment**: If an existing Niwa user (e.g., registered via Open-PO) logs in to Pustaka without a `pustaka` role, `POST /api/v1/auth/login` automatically grants `app_id: "pustaka", role: "member"` via `@niwa/auth-api`.

## 5. Entity-Relationship Schema (`pustaka-db` — Decoupled from Identity)
All primary keys (`id`) use `TEXT` with UUIDs generated via `crypto.randomUUID()`. Timestamps are stored as `INTEGER` (Unix epoch). `user_id` columns are logical `TEXT` UUID references to `@niwa/auth-api` `users.id` with no cross-DB SQL foreign keys.
- `bookshelves`: `id` (TEXT PK), `name` (TEXT), `location` (TEXT)
- `books`: `id` (TEXT PK), `title` (TEXT), `author` (TEXT), `isbn` (TEXT Unique), `total_pages` (INTEGER), `cover_image_key` (TEXT Nullable), `bookshelf_id` (TEXT FK -> `bookshelves.id`)
- `reading_lists`: `id` (TEXT PK), `user_id` (TEXT Not Null), `book_id` (TEXT FK -> `books.id`), `status` (TEXT), `updated_at` (INTEGER)
- `reading_progress`: `id` (TEXT PK), `user_id` (TEXT Not Null), `book_id` (TEXT FK -> `books.id`), `last_page_read` (INTEGER), `updated_at` (INTEGER)
- `book_reviews`: `id` (TEXT PK), `user_id` (TEXT Not Null), `username` (TEXT Not Null — snapshot at review creation), `book_id` (TEXT FK -> `books.id`), `rating` (INTEGER), `review_text` (TEXT)

## 6. API Endpoints Specification (`/api/v1`)
All request payloads and parameters are validated using `@hono/zod-validator` with schemas imported from `@niwa/pustaka-validators`.

### Auth & Users (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/register`: Delegates registration to `@niwa/auth-api` (`app_id: "pustaka"`) and returns `{ user, token, refresh_token, expires_in }`.
- `POST /api/v1/auth/login`: Delegates authentication to `@niwa/auth-api` (auto-enrolling SSO users as `pustaka` `member` if needed) and returns `{ user, token, refresh_token, expires_in }`.
- `POST /api/v1/auth/refresh`: Delegates refresh token rotation to `@niwa/auth-api`.
- `POST /api/v1/auth/logout` & `POST /api/v1/auth/logout-all`: Revokes refresh token sessions via `@niwa/auth-api`.
- `PUT /api/v1/auth/password`: Changes user password via `@niwa/auth-api` and returns rotated tokens.
- `GET /api/v1/users/profile` (or `/api/v1/auth/profile`): Verifies JWT at the edge and returns `{ user }`.
- `GET /api/v1/users`: Admin (`users:manage`) — lists users via `@niwa/auth-api` `GET /api/v1/acl/users`.
- `POST /api/v1/users/:id/roles`: Admin (`users:manage`) — assigns `admin` or `member` role for `pustaka` via `@niwa/auth-api` `PUT /api/v1/acl/users/:id/roles`.

### Inventory (`/api/v1/bookshelves`, `/api/v1/books`)
- `GET /api/v1/bookshelves` & `POST /api/v1/bookshelves`: List or create bookshelves (Admin).
- `GET /api/v1/books`, `GET /api/v1/books/:id`, `POST /api/v1/books`, `PUT /api/v1/books/:id`, `DELETE /api/v1/books/:id`, `PATCH /api/v1/books/:id/location`: Book catalog CRUD & relocation (Admin writes).

### Cloudflare R2 Media (`/api/v1/books/:id/cover`)
- `PUT /api/v1/books/:id/cover`: Upload cover image to R2 and update `cover_image_key` in D1 (Admin).
- `GET /api/v1/books/:id/cover`: Stream or proxy the R2 object buffer.

### Progress & Reviews (`/api/v1/me`, `/api/v1/books/:id/reviews`)
- `GET /api/v1/me/reading-list`, `POST /api/v1/me/reading-list`, `PATCH /api/v1/me/reading-list/:book_id`: Manage personal reading list.
- `GET /api/v1/me/progress/:book_id`, `PUT /api/v1/me/progress/:book_id`: Read/update `last_page_read` (`0 <= last_page_read <= total_pages`).
- `GET /api/v1/books/:id/reviews`, `POST /api/v1/books/:id/reviews`: List and create book reviews (using `book_reviews.username` snapshot).

## 7. Operating & Commit Conventions
- **Commit Format**: Strictly `[feat|fix|chore](pustaka-api): [commit_message]`
- **Bindings**: Type Hono environment bindings (`DB: D1Database`, `BUCKET: R2Bucket`, `JWT_SECRET: string`, `AUTH_API?: Fetcher`, `AUTH_API_URL?: string`) via `new Hono<AppEnv>()`.
