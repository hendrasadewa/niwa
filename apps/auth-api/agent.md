# Niwa Auth API — Agent Context (`agent.md`)

## 1. Project Overview
**`@niwa/auth-api`** (`niwa-auth-api`) is the standalone, multi-app **User Management, Identity & RBAC Service** for the `niwa` monorepo, targeting Cloudflare Workers and Cloudflare D1. It centralizes user registration, login, rotating refresh tokens & session revocation, password management, core user profile management (`name`, `whatsapp_number`), and app-scoped ACL / Role-Based Access Control across Niwa applications (`open-po`, `pustaka`, and future products).

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API `crypto.randomUUID()`, PBKDF2-HMAC-SHA256 password hashing, and SHA-256 refresh token hashing)
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
- **`refresh_tokens`**: `id` (TEXT PK), `user_id` (TEXT FK -> `users.id`), `family_id` (TEXT), `token_hash` (TEXT Unique — SHA-256 hex digest), `expires_at` (INTEGER), `revoked_at` (INTEGER Nullable), `replaced_by_id` (TEXT Nullable), `user_agent` (TEXT Nullable), `created_at` (INTEGER)

## 4. Multi-App RBAC Model
Default seeded applications, roles, and permissions:
- **`open-po`**:
  - Roles: `admin`, `seller`, `member`
  - Permissions: `catalog:read`, `store:manage`, `products:manage`, `waves:manage`, `orders:manage`, `orders:place`, `reviews:write`
- **`pustaka`**:
  - Roles: `admin`, `member`
  - Permissions: `inventory:read`, `inventory:write`, `reading:manage`, `reviews:write`, `users:manage`

The first registered user (or a user whose email matches `ADMIN_EMAIL`) automatically receives `admin` (plus standard roles) across seeded apps. Standard registrations default to `member` (and `seller` if requested for `open-po`).

## 5. Token & Refresh Token Contract
- **Access Token (`token`)**: Short-lived HS256 JWT (default 15 minutes, configurable via `ACCESS_TOKEN_TTL_SECONDS`) carrying `NiwaJwtPayload` (`sub`, `email`, `name`, `whatsapp_number`, `app_roles`, `app_permissions`, `created_at`, `iat`, `exp`) so downstream services verify identity and RBAC statelessly at the edge.
- **Refresh Token (`refresh_token`)**: Cryptographically random opaque token (`niwa_rt_...`, 30-day TTL, configurable via `REFRESH_TOKEN_TTL_SECONDS`), stored only as a SHA-256 hash in `refresh_tokens`.
- **Rotation & Reuse Detection**: Each `POST /api/v1/auth/refresh` rotates to a new token in the same `family_id` and revokes the previous token. Reusing an already-revoked token immediately revokes the entire `family_id`.

## 6. API Endpoints

### Auth & Sessions (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Register a new user, assign initial app roles, and return `{ user, token, refresh_token, expires_in }` (`201`).
- `POST /api/v1/auth/login`: Verify credentials via Web Crypto PBKDF2 and return `{ user, token, refresh_token, expires_in }` (`200`).
- `POST /api/v1/auth/refresh`: Rotate a valid `refresh_token` and return fresh `{ user, token, refresh_token, expires_in }` (with reuse detection).
- `POST /api/v1/auth/logout`: Revoke the provided `refresh_token` session family.
- `POST /api/v1/auth/logout-all`: Authenticated — revoke all active refresh tokens for the current user.
- `GET /api/v1/auth/sessions`: Authenticated — list active refresh token sessions for the current user.
- `GET /api/v1/auth/me` (alias `GET /api/v1/auth/profile`): Return latest `{ user }` profile & multi-app RBAC claims.
- `PUT /api/v1/auth/me`: Update `name` and/or `whatsapp_number` and return refreshed `{ user, token, expires_in }`.
- `PUT /api/v1/auth/password`: Verify `current_password`, update password hash, revoke existing sessions (unless `revoke_other_sessions: false`), and return fresh `{ message, user, token, refresh_token, expires_in }`.
- `POST /api/v1/auth/roles/grant`: Grant an app-scoped role and return refreshed `{ user, token, expires_in }` (admin required for `admin` role or targeting another `user_id`).
- `POST /api/v1/auth/roles/revoke`: Admin-only — revoke an app-scoped role from a user (guards against self-admin lockout).

### ACL & User Management (`/api/v1/acl` — Admin Only)
- `GET /api/v1/acl/apps` & `POST /api/v1/acl/apps`: List or register Niwa applications with roles & permissions.
- `GET /api/v1/acl/roles`, `POST /api/v1/acl/roles`, `PUT /api/v1/acl/roles/:roleId/permissions`, `DELETE /api/v1/acl/roles/:roleId`: Manage app roles and role-permission matrices.
- `GET /api/v1/acl/permissions`, `POST /api/v1/acl/permissions`, `DELETE /api/v1/acl/permissions/:permissionId`: Manage app permission slugs.
- `GET /api/v1/acl/users` & `GET /api/v1/acl/users/:userId`: List/filter (`?search=`, `?app_id=`, `?role=`, `?is_active=`) or inspect users with RBAC claims and active session counts.
- `PATCH /api/v1/acl/users/:userId/status`: Activate or deactivate a user (deactivating revokes all active refresh tokens).
- `POST /api/v1/acl/users/:userId/roles`, `DELETE /api/v1/acl/users/:userId/roles`, `PUT /api/v1/acl/users/:userId/roles`: Grant, revoke, or bulk-replace a user's roles for an app.

## 7. Bindings & Operating Conventions
- **Bindings**: `DB: D1Database`, `JWT_SECRET: string`, `ADMIN_EMAIL?: string`, `ACCESS_TOKEN_TTL_SECONDS?: string`, `REFRESH_TOKEN_TTL_SECONDS?: string`.
- **Documentation**: `.docs/PRD.md` and `.docs/PLAN.md` (gitignored).
- **Commit Convention**: Strictly `[feat|fix|chore](auth-api): [commit_message]` for `apps/auth-api` and `packages/validators/auth`.
