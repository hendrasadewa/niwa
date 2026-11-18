# Open-PO Web App (`@niwa/open-po-webapp`)

**Open-PO Web App** is the Next.js 16 (App Router) frontend for the UMKM Pre-Order Management System inside the `niwa` monorepo, consuming [`@niwa/open-po-api`](../open-po-api/README.md) and [`@niwa/open-po-validators`](../../packages/validators/open-po).

## 1. Tech Stack
- **Framework**: Next.js 16 (App Router, `src/app`), React 19, TypeScript
- **Cloudflare Deployment**: `@opennextjs/cloudflare` (`niwa-open-po-webapp`)
- **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/postcss`), `shadcn/ui` (Radix UI primitives), `lucide-react`
- **State & Fetching**: `@tanstack/react-query` v5, `AuthProvider` (JWT + owned stores), `CartProvider` (wave-scoped pre-order cart)
- **Forms & Validation**: `react-hook-form` + `@hookform/resolvers/zod` + `@niwa/open-po-validators`

## 2. Local Development

```bash
# 1. Start the Hono API on port 8787
pnpm dev:open-po

# 2. Start the Next.js Web App on port 3002
pnpm dev:open-po-web
```

## 3. Application Routes
- `/`: Discovery homepage (Live active pre-order waves, UMKM stores directory, quick Order ID tracking lookup)
- `/stores/[slug]`: UMKM Storefront (R2 store logo, active pre-order waves with locked prices & remaining quotas, master catalog, cart drawer)
- `/products/[id]`: Product detail & verified post-delivery customer reviews
- `/checkout`: Guest & Member pre-order checkout, manual transfer payment instructions, R2 payment receipt upload, and WhatsApp redirect confirmation
- `/track` & `/track/[orderId]`: Public 6-step visual order tracking timeline, R2 receipt upload/preview, courier tracking number, and "Confirm Received by Customer" button
- `/login` & `/register`: Customer Member & UMKM Seller authentication
- `/profile`: Member profile & default shipping address editor
- `/orders`: Member order history & post-delivery 1–5 star product review submission
- `/seller`: UMKM Seller Console (Overview, Store Creation onboarding, Store Settings & R2 Logo, Master Product Catalog CRUD, Pre-Order Waves & Snapshot Quotas, 6-column Kanban Order Fulfillment Dashboard)
