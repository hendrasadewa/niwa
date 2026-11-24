# Niwa Auth API — Agent Context (`@niwa/auth-api`)

## 1. Project Overview
**`@niwa/auth-api`** (`niwa-auth-api`) is the standalone, multi-app **Identity Provider (IdP), SSO & Multi-App RBAC Service** for the `niwa` monorepo, targeting Cloudflare Workers and Cloudflare D1. It centralizes user registration, password & Passkey (WebAuthn) authentication, email verification, cookie-based IdP SSO sessions (`__Host-niwa_session`), rotating refresh tokens, ES256 JWKS JWT issuance, user profile management, and app-scoped ACL/RBAC across Niwa applications (`open-po`, `pustaka`, `auth`, and future products).

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (`wrangler.jsonc`, Edge Runtime, Web Crypto API `crypto.randomUUID()`, PBKDF2-HMAC-SHA256 password hashing, SHA-256 token hashing)
- **Framework**: Hono v4 built on `@niwa/api-core` (`AppError`, `CommonErrors`, `errorHandler`, `notFoundHandler`, `validate()`, `createDbMiddleware()`, `createOriginCorsMiddleware()`)
- **Database**: Cloudflare D1 (`DB` binding -> `niwa-auth-db`) with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Validation**: Zod v4 schemas in `packages/validators/auth` (`@niwa/auth-validators`)
- **JWT & Passkeys**: `jose` (ES256 asymmetric keys published at `/.well-known/jwks.json`), `@simplewebauthn/server`
- **Local Dev Port**: `8788` (`pnpm dev:auth`)
- **Architecture Reference**: Follow `.agents/skills/niwa-api-architecture/SKILL.md` (`routes → services → repositories → db`).

## 3. Routes Mounted (`src/index.ts`)
- `/.well-known/jwks.json`: Public ES256 JWKS endpoint (public read CORS `*`)
- `/api/v1/sso/*`: Browser SSO session handoff, silent token minting, and consent flows
- `/api/v1/account/*`: Self-service account, connected apps, and active session management
- `/api/v1/auth/*`: Register, login, refresh rotation, logout/logout-all, profile (`/me`), password, email verification, passkeys, and role grant/revoke
- `/api/v1/acl/*`: Admin-only management for apps, roles, permissions, and users

## 4. Bindings & Conventions
- **Bindings (`src/types/env.ts`)**: `DB: D1Database`, `JWT_PRIVATE_KEY_JWK`, `JWT_ACTIVE_KID`, `JWT_ISSUER`, `AUTH_WEB_URL`, `ALLOWED_ORIGINS?`, `ADMIN_EMAIL?`, `EMAIL_FROM?`, `RESEND_API_KEY?`, `ACCESS_TOKEN_TTL_SECONDS?`, `REFRESH_TOKEN_TTL_SECONDS?`.
- **CORS & CSRF**: `strictCorsMiddleware` wraps `@niwa/api-core`'s `createOriginCorsMiddleware` with `allowCredentials: true` and dynamic D1 `apps.allowed_origins` lookup.
- **Documentation**: `.docs/PRD.md` and `.docs/PLAN.md` (gitignored), plus repo-wide `docs/architecture/auth-sso-idp.md`.
- **Commit Convention**: `[feat|fix|chore](auth-api): [commit_message]` for `apps/auth-api` and `packages/validators/auth`.
