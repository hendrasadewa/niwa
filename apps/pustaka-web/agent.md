# Pustaka Web App — Agent Context (`@niwa/pustaka-web`)

## 1. Overview & Architecture
- **App Name**: `@niwa/pustaka-web` (`apps/pustaka-web`)
- **Purpose**: User-facing frontend for the Pustaka household mini-library and reading progress tracker API (`@niwa/pustaka-api`).
- **Framework**: Next.js 16 (App Router, `src/app`), React 19, TypeScript.
- **Deployment Target**: Cloudflare Pages / Workers via `@opennextjs/cloudflare` (consistent with `@niwa/web`).
- **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/postcss`), `shadcn/ui` (Radix UI primitives), `lucide-react`.
- **State & Data Fetching**:
  - `@tanstack/react-query` for server state, caching, and optimistic updates.
  - Global API client (`src/lib/api.ts`) configured with `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`) and `Authorization: Bearer <token>` interceptor.
  - Global Auth Context / Store (`src/providers/auth-provider.tsx`) managing JWT token, user profile, roles (`admin` | `member`), and permissions.
- **Forms & Validation**: `react-hook-form` + `@hookform/resolvers/zod` consuming shared schemas from `@niwa/pustaka-validators` (`packages/validators/pustaka`).

## 2. Shared Validators (`@niwa/pustaka-validators`)
- **Auth**: `registerSchema`, `loginSchema`, `assignRoleSchema`
- **Bookshelf**: `createBookshelfSchema`, `updateBookshelfSchema`
- **Book**: `createBookSchema`, `updateBookSchema`, `updateBookLocationSchema`, `bookQuerySchema`, `bookIdParamSchema`
- **Reading**: `readingStatusSchema`, `addReadingListSchema`, `updateReadingListStatusSchema`, `updateReadingProgressSchema`
- **Review**: `createReviewSchema`

## 3. Application Routes
- **Public / Auth**:
  - `/login`: Member/Admin sign-in
  - `/register`: Household member registration
- **Member (Protected)**:
  - `/`: Dashboard (active "Reading" list with progress bars, recent library additions)
  - `/books`: Catalog (search with debounce, bookshelf filter, responsive grid/list of Book Cards)
  - `/books/[id]`: Book Details (metadata, R2 cover image `/api/v1/books/:id/cover`, reading status & page progress controls, average rating, user reviews)
  - `/profile`: User Profile (assigned roles, permissions, reading stats)
- **Admin (Protected — `admin` role required)**:
  - `/admin`: Admin Dashboard (high-level stats: total books, bookshelves, users)
  - `/admin/books`: Inventory Manager (CRUD, move bookshelf location, R2 cover upload via `PUT /api/v1/books/:id/cover`)
  - `/admin/bookshelves`: Bookshelf Manager (CRUD for physical storage locations)
  - `/admin/users`: User Manager (view household members and assign `admin` / `member` roles)

## 4. Reference Docs
- PRD: `apps/pustaka-web/.docs/pustaka_frontend_prd.md`
- Project Plan: `apps/pustaka-web/.docs/pustaka_frontend_project_plan.md`

## 5. Commit Convention
All commits for this app must strictly follow:
`[feat|fix|chore](pustaka-web): [commit_message]`
