# Pustaka Web App — Agent Context (`@niwa/pustaka-web`)

## 1. Overview & Architecture
- **App Name**: `@niwa/pustaka-web` (`apps/pustaka-web`, Worker: `niwa-pustaka-web`, dev port `3001`)
- **Purpose**: User-facing frontend for the Pustaka personal/household mini-library, shared libraries, and reading progress tracker API (`@niwa/pustaka-api`).
- **Framework**: Next.js 16 (App Router, `src/app`), React 19, TypeScript, deployed via `@opennextjs/cloudflare` (`wrangler.jsonc`).
- **Styling & UI**:
  - Tailwind CSS v4 (`@tailwindcss/postcss`) with `@niwa/ui/styles/tokens.css` (default Botanical Sage accent).
  - Shared UI primitives from **`@niwa/ui/primitives`** (`Button`, `Card`, `Dialog`, `DropdownMenu`, `Form`, `Input`, `Label`, `Select`, `Table`, `Textarea`, `Toast`, `Toaster`, `Badge`, `Progress`, `Skeleton`), layout/core components from **`@niwa/ui/components`** (`PageHeader`, `ColorSchemeToggle`, `FullPageLoader`, `Spinner`), and toast hook from **`@niwa/ui/hooks`** (`useToast`, `toast`). Do not create local `src/components/ui/*` copies.
- **Auth, State & Data Fetching**:
  - First-party SSO via `@niwa/auth` (`src/lib/sso.ts`, `src/providers/auth-provider.tsx`) with in-memory ES256 tokens refreshed via `auth-api`.
  - Shared API client via `@niwa/api-client` (`src/lib/api.ts`) + `@tanstack/react-query` (`src/providers/query-provider.tsx`).
- **Forms & Validation**: `react-hook-form` + `@hookform/resolvers/zod` consuming `@niwa/pustaka-validators`.

## 2. Application Routes
- **Public / Auth**: `/login`, `/register` (SSO handoff to `auth.hendrasadewa.com`), `/invites/[code]`
- **Member (Protected)**: `/`, `/books`, `/books/[id]`, `/libraries`, `/libraries/[id]`, `/profile`
- **Admin (Protected — `admin` role required)**: `/admin`, `/admin/books`, `/admin/bookshelves`, `/admin/users`

## 3. Reference Docs & Conventions
- Local `.docs/` (`pustaka_frontend_prd.md`, `pustaka_frontend_project_plan.md`, gitignored).
- Commit format: `[feat|fix|chore](pustaka-web): [commit_message]`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
