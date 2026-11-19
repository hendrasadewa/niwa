# Open-PO Web App — Agent Context (`@niwa/open-po-webapp`)

## 1. Overview & Architecture
- **App Name**: `@niwa/open-po-webapp` (`apps/open-po-webapp`)
- **Purpose**: Micro-ecommerce Pre-Order Management frontend for UMKM sellers and customers consuming `@niwa/open-po-api`.
- **Framework**: Next.js 16 (App Router, `src/app`), React 19, TypeScript.
- **Deployment Target**: Cloudflare Pages / Workers via `@opennextjs/cloudflare` (`niwa-open-po-webapp`).
- **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/postcss`), `shadcn/ui` (Radix UI primitives), `lucide-react`.
- **State & Data Fetching**:
  - `@tanstack/react-query` for server state, caching, and mutations.
  - Global API client (`src/lib/api.ts`) configured with `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`) and `Authorization: Bearer <token>` header injection.
  - Global Auth & Store Context (`src/providers/auth-provider.tsx`) managing JWT token, user profile, roles (`admin` | `seller` | `member`), owned stores, and currently selected active store.
  - Global Pre-Order Wave Cart Context (`src/providers/cart-provider.tsx`) persisted in `localStorage` (`open_po_cart`) scoped to an active pre-order wave.
- **Forms & Validation**: `react-hook-form` + `@hookform/resolvers/zod` consuming shared Zod v4 schemas from `@niwa/open-po-validators` (`packages/validators/open-po`).

## 2. Shared Validators (`@niwa/open-po-validators`)
- **Auth & Profile**: `registerSchema`, `loginSchema`, `updateProfileSchema`
- **Store**: `createStoreSchema`, `updateStoreSchema`, `storeQuerySchema`, `idParamSchema`
- **Product**: `createProductSchema`, `updateProductSchema`, `archiveProductSchema`, `productQuerySchema`
- **Wave**: `WAVE_STATUSES`, `waveStatusEnum`, `createWaveSchema`, `updateWaveSchema`, `updateWaveStatusSchema`, `upsertWaveProductSchema`, `waveQuerySchema`
- **Order**: `ORDER_STATUSES`, `orderStatusEnum`, `orderSlugRegex`, `checkoutOrderSchema`, `updateOrderStatusSchema`, `orderQuerySchema`, `guestOrderLookupQuerySchema`
- **Review**: `createReviewSchema`

## 3. Application Routes
- **Public & Storefront**:
  - `/`: Discovery homepage (Live active pre-order waves, UMKM stores directory, quick Order Code tracking bar + guest phone lookup shortcut)
  - `/stores/[slug]`: Storefront page (store header, R2 logo, active pre-order waves with locked prices & remaining quotas, master catalog, cart integration)
  - `/products/[id]`: Product detail & customer reviews page (`GET /api/v1/products/:id`, `GET /api/v1/products/:id/reviews`)
  - `/checkout`: Guest & Member wave checkout (`POST /api/v1/orders/checkout` with optional custom `slug` / Order Code), payment instructions, R2 transfer receipt upload (`PUT /api/v1/orders/:slugOrId/receipt`), and WhatsApp redirect confirmation
  - `/track` & `/track/[orderId]`: Dual-mode tracking (`/track` supports both **Track by Order Code (`slug`)** and **Find Orders by WhatsApp / Phone Number** via `GET /api/v1/track/lookup?phone=...`) and 6-step visual status timeline (`GET /api/v1/track/:slugOrId`, `PATCH /api/v1/track/:slugOrId/confirm-received`). Displays masked PII (`is_pii_masked: true`) with a "Log in to Unlock PII" banner in guest view, unlocks full customer/shipping/receipt details when authenticated as the order/store owner, and renders an "Access Restricted (403 Forbidden)" card if a logged-in user attempts to view another customer's order.
- **Auth**:
  - `/login`: Customer / Seller sign-in
  - `/register`: Customer / Seller registration
- **Customer Member (Protected)**:
  - `/profile`: Update `name`, `whatsapp_number`, `default_shipping_address` (`PUT /api/v1/me`)
  - `/orders`: Member order history (`GET /api/v1/me/orders`) + Post-delivery 1–5 star product review submission (`POST /api/v1/reviews`)
- **Seller Console (Protected)**:
  - `/seller`: Seller Overview & Store Creation onboarding (`POST /api/v1/stores`, `GET /api/v1/me/stores`)
  - `/seller/store`: Store Settings, Payment Instructions & R2 Logo upload (`PUT /api/v1/stores/:id`, `PUT /api/v1/stores/:id/logo`)
  - `/seller/products`: Master Product Catalog CRUD, soft-archive & R2 product image upload (`POST/PUT /api/v1/products`, `PATCH /api/v1/products/:id/archive`, `PUT /api/v1/products/:id/image`)
  - `/seller/waves`: Pre-Order Waves list, creation & status transitions (`GET/POST /api/v1/waves`, `PATCH /api/v1/waves/:id/status`)
  - `/seller/waves/[id]`: Wave Snapshot Configuration (`POST /api/v1/waves/:id/products`, `DELETE /api/v1/waves/:id/products/:wave_product_id`)
  - `/seller/orders`: 6-column Kanban Order Fulfillment Dashboard (`GET /api/v1/orders?view=kanban`, `PATCH /api/v1/orders/:id/status`) with receipt verification & courier tracking number entry

## 4. Reference Docs
- PRD: `apps/open-po-webapp/.docs/PRD.md`
- Project Plan: `apps/open-po-webapp/.docs/PLAN.md`

## 5. Commit Convention
All commits for this app must strictly follow:
`[feat|fix|chore](open-po-webapp): [commit_message]`
