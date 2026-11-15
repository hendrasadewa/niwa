# Pustaka Web App (`@niwa/pustaka-web`)

**Pustaka Web App** is the Next.js 16 (App Router) frontend for the Pustaka household mini-library and reading progress tracker API (`@niwa/pustaka-api`).

## Tech Stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS v4, `shadcn/ui` (Radix UI primitives), `lucide-react`
- **State & Data Fetching**: `@tanstack/react-query` with optimistic updates
- **Forms & Validation**: `react-hook-form` + `@hookform/resolvers/zod` powered by `@niwa/pustaka-validators`
- **Deployment**: Cloudflare Pages / Workers via `@opennextjs/cloudflare`

## Getting Started (Local Development)

1. **Start the Backend API (`@niwa/pustaka-api`)**:
   ```bash
   pnpm --filter @niwa/pustaka-api db:migrate:local
   pnpm dev:pustaka
   ```
   The API runs at `http://localhost:8787`.

2. **Configure Frontend Environment Variables (Optional)**:
   ```bash
   cp apps/pustaka-web/.env.example apps/pustaka-web/.env.local
   ```
   Default `NEXT_PUBLIC_API_URL` is `http://localhost:8787`.

3. **Start the Frontend Dev Server**:
   ```bash
   pnpm dev:pustaka-web
   ```
   The web app runs at `http://localhost:3001`.

## Scripts (`apps/pustaka-web/package.json`)
- `pnpm dev` — Start Next.js dev server on port `3001`
- `pnpm build` — Build production Next.js bundle
- `pnpm typecheck` — Run TypeScript typechecking (`tsc --noEmit`)
- `pnpm lint` — Run ESLint
- `pnpm preview` — Build and preview on Cloudflare runtime via `opennextjs-cloudflare`
- `pnpm deploy` — Build and deploy to Cloudflare via `opennextjs-cloudflare`
