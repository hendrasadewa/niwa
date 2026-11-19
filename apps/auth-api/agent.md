# Niwa Auth API — Agent Context (`agent.md`)

## 1. Project Overview
**`@niwa/auth-api`** (`niwa-auth-api`) is the standalone, multi-app **User Management, Identity & RBAC Service** for the `niwa` monorepo, targeting Cloudflare Workers and Cloudflare D1. It centralizes user registration, login, core user profile management (`name`, `whatsapp_number`), and app-scoped Role-Based Access Control (RBAC) across Niwa applications (`open-po`, `pustaka`, and future products).

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API `crypto.randomUUID()` & PBKDF2-HMAC-SHA256 password hashing)
- **Framework**: Hono v4 (`hono`, `hono/jwt`, `@hono/zod-validator`)
- **Database**: Cloudflare D1 (`DB` binding -> `niwa-auth-db`) with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Validation**: Zod v4 schemas in `packages/validators/auth` (`@niwa/auth-validators`), linked via `"@niwa/auth-validators": "workspace:*"`
- **Local Dev Port**: `8788` (`pnpm dev:auth`)
- **Language**: TypeScript (extending root `tsconfig.base.json` with `strict: true`)

## 3. Entity-Relationship Schema (`niwa-auth-db`)
All primary keys use `TEXT` UUIDs (`crypto.randomUUID()`) or stable app/seed identifiers. Timestamps are stored as `INTEGER` (Unix epoch seconds).

- **`users`**: `id` (TEXT PK), `email` (TEXT Unique), `password_hash` (TEXT), `name` (TEXT), `whatsapp_number` (TEXT), `is_active` (INTEGER boolean, default `true`), `created_at` (INTEGER), `updated_at` (INTEGER)
- **`apps`**: `id` (TEXT PK — e.g. `'open-po'`, `'pustaka'`), `name` (TEXT), `description` (TEXT)
- **`roles`**: `id` (TEXT PK), `app_id` (TEXT FK -> `apps.id`), `name` (TEXT — e.g. `'admin'`, `'seller'`, `'member'`), `description` (TEXT), unique on `(app_id, name)`
- **`user_app_roles`**: `user_id` (TEXT FK -> `users.id`), `app_id` (TEXT FK -> `apps.id`), `role_id` (TEXT FK -> `roles.id`), composite PK `(user_id, app_id, role_id)`
- **`permissions`**: `id` (TEXT PK), `app_id` (TEXT FK -> `apps.id`), `slug` (TEXT), `description` (TEXT), unique on `(app_id, slug)`
- **`role_permissions`**: `role_id` (TEXT FK -> `roles.id`), `permission_id` (TEXT FK -> `permissions.id`), composite PK `(role_id, permission_id)`

## 4. Multi-App RBAC Model
Default seeded applications, roles, and permissions:
- **`open-po`**:
  - Roles: `admin`, `seller`, `member`
  - Permissions: `catalog:read`, `store:manage`, `products:manage`, `waves:manage`, `orders:manage`, `orders:place`, `reviews:write`
- **`pustaka`**:
  - Roles: `admin`, `member`
  - Permissions: `inventory:read`, `inventory:write`, `reading:manage`, `reviews:write`, `users:manage`

The first registered user (or a user whose email matches `ADMIN_EMAIL`) automatically receives `admin` (plus standard roles) across seeded apps. Standard registrations default to `member` (and `seller` if requested for `open-po`).

## 5. JWT Claims Contract (`NiwaJwtPayload`)
Tokens are signed with HS256 using the shared `JWT_SECRET` (7-day TTL) so downstream services (`@niwa/open-po-api`, `@niwa/pustaka-api`, etc.) can verify user identity and app-scoped RBAC statelessly at the edge:

```ts
export type NiwaJwtPayload = {
  sub: string;
  email: string;
  name: string;
  whatsapp_number: string;
  app_roles: Record<string, string[]>;
  app_permissions: Record<string, string[]>;
  created_at?: number;
  iat: number;
  exp: number;
};
```

## 6. API Endpoints (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Register a new user, seed/assign initial app roles, and return `{ user, token }` (`201`).
- `POST /api/v1/auth/login`: Verify credentials via Web Crypto PBKDF2 and return `{ user, token }` (`200`).
- `GET /api/v1/auth/me` (alias `GET /api/v1/auth/profile`): Verify Bearer JWT and return latest `{ user }` profile & multi-app RBAC claims.
- `PUT /api/v1/auth/me`: Update `name` and/or `whatsapp_number` and return refreshed `{ user, token }`.
- `POST /api/v1/auth/roles/grant`: Grant an app-scoped role (e.g., `{ app_id: "open-po", role: "seller" }`) and return refreshed `{ user, token }`. Granting `admin` or modifying another `user_id` requires an `admin` caller.

## 7. Bindings & Operating Conventions
- **Bindings**: `DB: D1Database`, `JWT_SECRET: string`, `ADMIN_EMAIL?: string`.
- **Documentation**: `.docs/PRD.md` and `.docs/PLAN.md` (gitignored).
- **Commit Convention**: Strictly `[feat|fix|chore](auth-api): [commit_message]` for `apps/auth-api` and `packages/validators/auth`.
