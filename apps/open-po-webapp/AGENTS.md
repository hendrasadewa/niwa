# Open-PO Web App — Agent Context (`@niwa/open-po-webapp`)

## 1. Overview & Architecture
- **App Name**: `@niwa/open-po-webapp` (`apps/open-po-webapp`, Worker: `niwa-open-po-webapp`, dev port `3002`)
- **Purpose**: Micro-ecommerce Pre-Order Management frontend for UMKM sellers and customers consuming `@niwa/open-po-api`.
- **Framework**: Next.js 16 (App Router, `src/app`), React 19, TypeScript, deployed via `@opennextjs/cloudflare` (`wrangler.jsonc`).
- **Styling & UI**:
  - Tailwind CSS v4 (`@tailwindcss/postcss`) with `@niwa/ui/styles/tokens.css` (`data-brand="preorder"` Waterlily Pink accent).
  - Shared UI primitives from **`@niwa/ui/primitives`** (`Button`, `Card`, `Dialog`, `DropdownMenu`, `Form`, `Input`, `Label`, `Select`, `Table`, `Textarea`, `Toast`, `Toaster`, `Badge`, `Progress`, `Skeleton`), layout/core components from **`@niwa/ui/components`** (`PageHeader`, `ColorSchemeToggle`, `FullPageLoader`), and toast hook from **`@niwa/ui/hooks`** (`useToast`, `toast`). Do not create local `src/components/ui/*` copies.
- **Auth, State & Data Fetching**:
  - First-party SSO via `@niwa/auth` (`src/lib/sso.ts`, `src/providers/auth-provider.tsx`) with in-memory ES256 tokens refreshed via `auth-api`.
  - Shared API client via `@niwa/api-client` (`src/lib/api.ts`) + `@tanstack/react-query` (`src/providers/query-provider.tsx`).
  - Cart state in `src/providers/cart-provider.tsx` (`localStorage` key `open_po_cart`).
- **Forms & Validation**: `react-hook-form` + `@hookform/resolvers/zod` consuming `@niwa/open-po-validators`.

## 2. Application Routes
- **Public & Storefront**: `/`, `/stores/[slug]`, `/products/[id]`, `/checkout`, `/track`, `/track/[orderId]`
- **Auth**: `/login`, `/register` (SSO handoff to `auth.hendrasadewa.com`)
- **Customer Member**: `/profile`, `/orders`
- **Seller Console**: `/seller`, `/seller/store`, `/seller/products`, `/seller/waves`, `/seller/waves/[id]`, `/seller/orders`

## 3. Reference Docs & Conventions
- Local `.docs/` (`PRD.md`, `PLAN.md`, gitignored).
- Commit format: `[feat|fix|chore](open-po-webapp): [commit_message]`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
