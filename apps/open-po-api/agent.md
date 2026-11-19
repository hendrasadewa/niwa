# Open-PO API — Agent Context (`agent.md`)

## 1. Project Overview
**"Open-PO"** (`@niwa/open-po-api`) is a micro-ecommerce pre-order management API built for UMKM (micro-to-small business) sellers and customers within the `niwa` monorepo, targeting Cloudflare's serverless edge ecosystem. It replaces manual WhatsApp pre-order tracking with structured store profiles, master product catalogs, time-bound pre-order waves with price snapshots and quotas, guest/member checkouts, manual transfer receipt uploads, a Seller Kanban fulfillment state machine, public order tracking, and post-delivery product reviews.

User identity, authentication, and multi-app RBAC are delegated to the standalone **`@niwa/auth-api`** (`niwa-auth-api`) service. `@niwa/open-po-api` verifies HS256 JWTs issued by `@niwa/auth-api` statelessly at the edge using the shared `JWT_SECRET`, and stores only ecommerce-specific user metadata (`customer_profiles`) and denormalized order/review customer snapshots in `open-po-db`.

## 2. Architecture & Technology Stack
- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API `crypto.randomUUID()`)
- **Framework**: Hono v4 (`hono`, `hono/jwt`, `@hono/zod-validator`)
- **Identity & RBAC Service**: `@niwa/auth-api` (`niwa-auth-api`), called via Cloudflare Service Binding (`AUTH_API`) or `AUTH_API_URL` (`http://127.0.0.1:8788` in local dev)
- **Database**: Cloudflare D1 (Serverless SQLite, `open-po-db`) with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Object Storage**: Cloudflare R2 (`BUCKET` binding -> `open-po-media` for store logos, product images, and payment receipts)
- **Validation**: Zod v4 schemas housed in `packages/validators/open-po` (`@niwa/open-po-validators`)
- **Language**: TypeScript (extending root `tsconfig.base.json` with `strict: true`)

## 3. Monorepo Structure & Workspace Requirements
- **API Application**: `apps/open-po-api` (`@niwa/open-po-api`, local dev port `8787`)
- **Identity Service**: `apps/auth-api` (`@niwa/auth-api`, local dev port `8788`)
- **Shared Validation**: `packages/validators/open-po` (`@niwa/open-po-validators`), linked in `apps/open-po-api/package.json` via `"@niwa/open-po-validators": "workspace:*"`
- **Documentation**: Stored locally in `apps/open-po-api/.docs/` (`PRD.md`, `PLAN.md`, `AUTH_SEPARATION_PLAN.md`), ignored by Git via `.gitignore`.

## 4. Actors, Store Ownership & Edge-Compatible RBAC
Roles and permissions are read from `app_roles["open-po"]` and `app_permissions["open-po"]` in the verified `NiwaJwtPayload`:
- **Admin (`admin`)**: Global platform administrator with full privileges across all stores, products, waves, and orders.
- **Seller (`seller`)**: Authenticated user who creates one or more stores via `POST /api/v1/stores`. Recorded as `stores.owner_id` (logical UUID reference) and granted the `open-po` `seller` role via `@niwa/auth-api` `POST /api/v1/auth/roles/grant` (returning a refreshed JWT). Has full read/write access to their own store settings, logo, master catalog products, pre-order waves, and Kanban order fulfillment.
- **Customer Member (`member`)**: Authenticated customer who can manage their profile/default shipping address, view order history, checkout with auto-filled shipping details, upload payment receipts, and submit product reviews on `Received by Customer` orders.
- **Customer Guest (Unauthenticated)**: Public read access to stores, products, and active waves; can submit guest orders (`customer_id = null`, `guest_name`, `guest_whatsapp`), upload payment receipts, and track order progress via Order Code/UUID.

## 5. Entity-Relationship Schema (`open-po-db` — Decoupled from Identity)
All primary keys (`id`) use `TEXT` with UUIDs generated via `crypto.randomUUID()`. Timestamps are stored as `INTEGER` (Unix epoch seconds). Prices/amounts use `INTEGER` (lowest currency denomination). `user_id` / `owner_id` / `customer_id` columns are logical `TEXT` UUID references to `@niwa/auth-api` `users.id` with no cross-DB SQL foreign keys.
- `customer_profiles`: `user_id` (TEXT PK), `default_shipping_address` (TEXT Nullable), `updated_at` (INTEGER)
- `stores`: `id` (TEXT PK), `owner_id` (TEXT Not Null), `slug` (TEXT Unique), `name` (TEXT), `description` (TEXT), `logo_url` (TEXT Nullable), `payment_instructions` (TEXT), `whatsapp_contact` (TEXT), `created_at` (INTEGER)
- `products`: `id` (TEXT PK), `store_id` (TEXT FK -> `stores.id`), `name` (TEXT), `description` (TEXT), `base_price` (INTEGER), `image_url` (TEXT Nullable), `is_archived` (INTEGER boolean)
- `pre_order_waves`: `id` (TEXT PK), `store_id` (TEXT FK -> `stores.id`), `name` (TEXT), `start_date` (INTEGER), `end_date` (INTEGER), `status` (TEXT: `'Draft' | 'Active' | 'Closed'`)
- `wave_products`: `id` (TEXT PK), `wave_id` (TEXT FK -> `pre_order_waves.id`), `product_id` (TEXT FK -> `products.id`), `locked_price` (INTEGER), `quota` (INTEGER Nullable)
- `orders`: `id` (TEXT PK), `slug` (TEXT Unique — human-readable order code, e.g. `DAPU-261118-A7K9` or custom slug), `wave_id` (TEXT FK -> `pre_order_waves.id`), `customer_id` (TEXT Nullable), `customer_name` (TEXT Nullable — snapshot at checkout), `customer_whatsapp` (TEXT Nullable — snapshot at checkout), `guest_name` (TEXT Nullable), `guest_whatsapp` (TEXT Nullable), `shipping_address` (TEXT), `total_amount` (INTEGER), `payment_receipt_url` (TEXT Nullable), `status` (TEXT: `'Received' | 'In Preparation' | 'Waiting for Shipment' | 'On Shipping' | 'Delivered' | 'Received by Customer'`), `tracking_number` (TEXT Nullable), `created_at` (INTEGER)
- `order_items`: `id` (TEXT PK), `order_id` (TEXT FK -> `orders.id`), `wave_product_id` (TEXT FK -> `wave_products.id`), `quantity` (INTEGER), `subtotal` (INTEGER)
- `reviews`: `id` (TEXT PK), `product_id` (TEXT FK -> `products.id`), `order_id` (TEXT FK -> `orders.id`), `customer_id` (TEXT Not Null), `customer_name` (TEXT Not Null — snapshot at review creation), `rating` (INTEGER 1-5), `comment` (TEXT), `created_at` (INTEGER)

## 6. API Endpoints Specification (`/api/v1`)
All request payloads and parameters are validated using `@hono/zod-validator` with schemas imported from `@niwa/open-po-validators`.

### Auth & Profile (`/api/v1/auth`, `/api/v1/me`)
- `POST /api/v1/auth/register`: Delegates registration to `@niwa/auth-api` (`app_id: "open-po"`), saves `default_shipping_address` in `customer_profiles`, and returns `{ user, token }`.
- `POST /api/v1/auth/login`: Delegates authentication to `@niwa/auth-api`, hydrates `default_shipping_address` from `customer_profiles`, and returns `{ user, token }`.
- `GET /api/v1/auth/profile` & `GET /api/v1/me`: Verifies JWT at the edge, hydrates `default_shipping_address`, and returns `{ user, stores }`.
- `PUT /api/v1/me`: Delegates `name`/`whatsapp_number` updates to `@niwa/auth-api` (returning refreshed `token`), upserts `default_shipping_address` in `customer_profiles`, and returns `{ user, token? }`.
- `GET /api/v1/me/stores`: List stores owned by the authenticated user.
- `GET /api/v1/me/orders`: List past and current orders placed by the authenticated user.

### Stores & R2 Store Logos (`/api/v1/stores`)
- `GET /api/v1/stores`: List all stores (supports `?slug=` lookup).
- `POST /api/v1/stores`: Create a new store owned by the current authenticated user, delegate granting `open-po` `seller` role to `@niwa/auth-api`, and return `{ store, token?, user? }`.
- `GET /api/v1/stores/:id`: Get store details by store ID or slug.
- `PUT /api/v1/stores/:id`: Update store configuration and payment instructions (Store Owner / Admin).
- `PUT /api/v1/stores/:id/logo`: Upload store logo to R2 and update `logo_url` (Store Owner / Admin).
- `GET /api/v1/stores/:id/logo`: Stream store logo image from R2.
- `GET /api/v1/stores/:id/waves/active`: Get active pre-order waves and available wave products for a store.

### Master Product Catalog (`/api/v1/products`)
- `GET /api/v1/products`: List products for a store (`?store_id=`, `?search=`, `?include_archived=`).
- `GET /api/v1/products/:id`: Get single product details with review summary.
- `POST /api/v1/products`: Create a new master product (Store Owner / Admin).
- `PUT /api/v1/products/:id`: Update product metadata or `base_price` (Store Owner / Admin).
- `PATCH /api/v1/products/:id/archive`: Archive or unarchive a product (Store Owner / Admin).
- `PUT /api/v1/products/:id/image`: Upload product image to R2 and update `image_url` (Store Owner / Admin).
- `GET /api/v1/products/:id/image`: Stream product image from R2.
- `GET /api/v1/products/:id/reviews`: List customer reviews for a product (using `reviews.customer_name` snapshot).

### Pre-Order Waves (`/api/v1/waves`)
- `GET /api/v1/waves`: List waves for a store (`?store_id=`, `?status=`).
- `GET /api/v1/waves/active`: List active waves (`?store_id=`) with products, locked prices, and remaining quotas.
- `GET /api/v1/waves/:id`: Get wave details and included `wave_products`.
- `POST /api/v1/waves`: Create a new wave in `Draft` status (Store Owner / Admin).
- `PUT /api/v1/waves/:id`: Update wave metadata/dates (Store Owner / Admin).
- `PATCH /api/v1/waves/:id/status`: Update wave status (`Draft` -> `Active` -> `Closed`) (Store Owner / Admin).
- `POST /api/v1/waves/:id/products`: Attach or update a product snapshot (`locked_price`, `quota`) in a wave (Store Owner / Admin).
- `DELETE /api/v1/waves/:id/products/:wave_product_id`: Remove a product from a draft wave (Store Owner / Admin).

### Checkout, Orders, Kanban & Tracking (`/api/v1/orders`, `/api/v1/track`)
- `POST /api/v1/orders/checkout`: Submit a Member or Guest order for an active wave (with auto-generated or custom `slug` and `customer_name`/`customer_whatsapp` snapshots), validate quotas, calculate totals, and generate WhatsApp redirect URL.
- `GET /api/v1/orders/lookup`: Lookup guest/customer order history by phone number (`?phone=` or `?whatsapp=`, optional `?store_id=`). Masks PII for unauthenticated guests (`is_pii_masked: true`), unlocks PII for the authenticated owner, and returns `403 Forbidden` if a logged-in user queries another user's phone number.
- `GET /api/v1/orders`: List orders for a store/wave (`?store_id=`, `?wave_id=`, `?status=`, `?view=kanban`) (Store Owner / Admin).
- `GET /api/v1/orders/:id`: Get detailed unmasked order record by Order Slug or UUID (Authenticated Order Owner / Store Owner / Admin only; returns `403 Forbidden` for other logged-in users).
- `PATCH /api/v1/orders/:id/status`: Advance order status in state machine and optionally record `tracking_number` by Order Slug or UUID (Store Owner / Admin).
- `PUT /api/v1/orders/:id/receipt`: Upload manual payment transfer proof image to R2 by Order Slug or UUID (blocks other logged-in users with `403 Forbidden`).
- `GET /api/v1/orders/:id/receipt`: Stream payment receipt image from R2 by Order Slug or UUID (Authenticated Order Owner / Store Owner / Admin only).
- `GET /api/v1/track` & `GET /api/v1/track/lookup`: Lookup guest/customer order history by phone number (`?phone=` or `?whatsapp=`, optional `?store_id=`) with guest PII masking and cross-user protection.
- `GET /api/v1/track/:id`: Public order tracking timeline by Order Slug (e.g. `DAPU-261118-A7K9`) or UUID. Masks PII (`customer_display_name`, `whatsapp_number`, `shipping_address`, `payment_receipt_url`) when unauthenticated (`is_pii_masked: true`), unlocks PII when logged in as the order/store owner (`is_pii_masked: false`), and blocks other logged-in users with `403 Forbidden`.
- `PATCH /api/v1/track/:id/confirm-received`: Confirm delivery receipt (`Delivered` -> `Received by Customer`) by Order Slug or UUID.

### Post-Delivery Reviews (`/api/v1/reviews`)
- `POST /api/v1/reviews`: Submit a 1-5 star rating and comment (storing `customer_name` snapshot) for a product in an order with status `Received by Customer` (Member / Admin).

## 7. Operating & Commit Conventions
- **Commit Format**: Strictly `[feat|fix|chore](open-po-api): [commit_message]`
- **Bindings**: Type Hono environment bindings (`DB: D1Database`, `BUCKET: R2Bucket`, `JWT_SECRET: string`, `AUTH_API?: Fetcher`, `AUTH_API_URL?: string`) via `new Hono<AppEnv>()`.
