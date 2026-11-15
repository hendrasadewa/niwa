# Pustaka API — Agent Context (`agent.md`)

## 1. Project Overview
**"Pustaka"** is a self-hosted, lightweight mini-library and reading progress tracking API designed for personal and household use within the `niwa` monorepo, targeting Cloudflare's serverless edge ecosystem.

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API `crypto.randomUUID()` and Web Crypto password hashing)
- **Framework**: Hono v4 (`hono`, `hono/jwt`, `@hono/zod-validator`)
- **Database**: Cloudflare D1 (Serverless SQLite) with Drizzle ORM / SQL migrations
- **Object Storage**: Cloudflare R2 (for book cover image storage and streaming)
- **Validation**: Zod schemas housed in `packages/validators/pustaka` (`@niwa/pustaka-validators`)
- **Language**: TypeScript (extending root `tsconfig.base.json` with `strict: true`)

## 3. Monorepo Structure & Workspace Requirements
- **API Application**: `apps/pustaka-api` (`@niwa/pustaka-api`)
- **Shared Validation**: `packages/validators/pustaka` (`@niwa/pustaka-validators`), linked in `apps/pustaka-api/package.json` via `"@niwa/pustaka-validators": "workspace:*"`
- **Documentation**: Stored locally in `apps/pustaka-api/.docs/` (`PRD.md` and `PLAN.md`), ignored by Git via `.gitignore`.

## 4. Actors & Edge-Compatible RBAC
- **Admin**: Full privileges over book inventory, bookshelf locations, cover uploads, user management, and role assignments.
- **Member**: View inventory, manage personal reading lists, update reading progress, and add book reviews.

## 5. Entity-Relationship Schema (Cloudflare D1 / SQLite)
All primary keys (`id`) use `TEXT` with UUIDs generated via `crypto.randomUUID()`. Timestamps are stored as `INTEGER` (Unix epoch).
- `users`: `id` (TEXT PK), `username` (TEXT), `email` (TEXT Unique), `password_hash` (TEXT), `created_at` (INTEGER)
- `roles`: `id` (TEXT PK), `name` (TEXT Unique), `description` (TEXT)
- `user_roles`: `user_id` (TEXT FK), `role_id` (TEXT FK)
- `permissions`: `id` (TEXT PK), `slug` (TEXT Unique), `description` (TEXT)
- `role_permissions`: `role_id` (TEXT FK), `permission_id` (TEXT FK)
- `bookshelves`: `id` (TEXT PK), `name` (TEXT), `location` (TEXT)
- `books`: `id` (TEXT PK), `title` (TEXT), `author` (TEXT), `isbn` (TEXT Unique), `total_pages` (INTEGER), `cover_image_key` (TEXT Nullable), `bookshelf_id` (TEXT FK)
- `reading_lists`: `id` (TEXT PK), `user_id` (TEXT FK), `book_id` (TEXT FK), `status` (TEXT), `updated_at` (INTEGER)
- `reading_progress`: `id` (TEXT PK), `user_id` (TEXT FK), `book_id` (TEXT FK), `last_page_read` (INTEGER), `updated_at` (INTEGER)
- `book_reviews`: `id` (TEXT PK), `user_id` (TEXT FK), `book_id` (TEXT FK), `rating` (INTEGER), `review_text` (TEXT)

## 6. API Endpoints Specification (`/api/v1`)
All request payloads and parameters are validated using `@hono/zod-validator` with schemas imported from `@niwa/pustaka-validators`.

### Auth & Users (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/register`: Create member account.
- `POST /api/v1/auth/login`: Authenticate and issue JWT.
- `GET /api/v1/users/profile` (or `/api/v1/auth/profile`): Retrieve current authenticated user profile.

### Inventory (`/api/v1/bookshelves`, `/api/v1/books`)
- `GET /api/v1/bookshelves`: List all bookshelves.
- `POST /api/v1/bookshelves`: Create a new bookshelf (Admin).
- `GET /api/v1/books`: List/search books.
- `POST /api/v1/books`: Add a new book (Admin).
- `PUT /api/v1/books/:id`: Update book metadata (Admin).
- `DELETE /api/v1/books/:id`: Delete a book (Admin).
- `PATCH /api/v1/books/:id/location`: Move book to a different bookshelf (Admin).

### Cloudflare R2 Media (`/api/v1/books/:id/cover`)
- `PUT /api/v1/books/:id/cover`: Upload cover image to R2 and update `cover_image_key` in D1 (Admin).
- `GET /api/v1/books/:id/cover`: Stream or proxy the R2 object buffer.

### Progress & Reviews (`/api/v1/me`, `/api/v1/books/:id/reviews`)
- `GET /api/v1/me/reading-list`: Get current user's reading list.
- `POST /api/v1/me/reading-list`: Add a book to current user's reading list.
- `PATCH /api/v1/me/reading-list/:book_id`: Update reading status (`reading`, `completed`, etc.).
- `GET /api/v1/me/progress/:book_id`: Get reading progress for a book.
- `PUT /api/v1/me/progress/:book_id`: Update `last_page_read` (must satisfy `0 <= last_page_read <= total_pages`).
- `GET /api/v1/books/:id/reviews`: List reviews for a book.
- `POST /api/v1/books/:id/reviews`: Add user review and rating for a book.

## 7. Operating & Commit Conventions
- **Commit Format**: Strictly `[feat|fix|chore](pustaka-api): [commit_message]`
- **Bindings**: Type Hono environment bindings (`DB: D1Database`, `BUCKET: R2Bucket`, `JWT_SECRET: string`) via `new Hono<{ Bindings: Bindings }>()`.
