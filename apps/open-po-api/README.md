# Open-PO API (`@niwa/open-po-api`)

**Open-PO** is a micro-ecommerce Pre-Order Management REST API built for UMKM (micro-to-small business) sellers and customers within the `niwa` monorepo. It is engineered for edge deployments on **Cloudflare Workers** using **Hono v4**, **Cloudflare D1 (SQLite)**, **Cloudflare R2**, **Drizzle ORM**, and **Zod v4**.

---

## 1. Architecture & Tech Stack

- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API `crypto.subtle` PBKDF2-HMAC-SHA256 & `crypto.randomUUID()`)
- **Framework**: [Hono v4](https://hono.dev/) (`hono`, `hono/jwt`, `@hono/zod-validator`)
- **Database**: Cloudflare D1 (Serverless SQLite) + [Drizzle ORM](https://orm.drizzle.team/)
- **Object Storage**: Cloudflare R2 (`BUCKET` binding for store logos, product images, and manual transfer payment receipts)
- **Shared Validation**: `@niwa/open-po-validators` (`packages/validators/open-po`) powered by Zod v4

---

## 2. Getting Started (Local Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Apply Local D1 Migrations
```bash
pnpm --filter @niwa/open-po-api db:migrate:local
```

### 3. Start the Development Server
```bash
pnpm dev:open-po
```

---

## 3. Actors, Store Ownership & Edge RBAC

| Actor / Role | Capabilities |
| :--- | :--- |
| **Seller (`seller` / `admin`)** | Create and manage their own stores (`POST /api/v1/stores`), configure payment instructions & R2 store logo, manage Master Product Catalog, create/activate Pre-Order Waves with locked prices & quotas, and advance orders through the Kanban fulfillment state machine. |
| **Customer Member (`member`)** | Register/login, manage saved profile & default shipping address, view order history, checkout with auto-filled shipping details, upload payment receipts, and submit post-delivery product reviews. |
| **Customer Guest** | Browse store profiles, catalog products, and active waves; submit guest checkouts (`guest_name`, `guest_whatsapp`); upload payment receipts; and track orders publicly via `/api/v1/track/:id`. |

---

## 4. API Endpoints Summary (`/api/v1`)

### Auth & Profile (`/api/v1/auth`, `/api/v1/me`)
- `POST /api/v1/auth/register`: Register account (`email`, `password`, `name`, `whatsapp_number`, optional `default_shipping_address`, optional `role`) and issue JWT.
- `POST /api/v1/auth/login`: Authenticate and issue JWT.
- `GET /api/v1/auth/profile` & `GET /api/v1/me`: Get current user profile and owned stores.
- `PUT /api/v1/me`: Update `name`, `whatsapp_number`, `default_shipping_address`.
- `GET /api/v1/me/stores`: List stores owned by the authenticated user.
- `GET /api/v1/me/orders`: List past and current orders placed by the authenticated user.

### Stores & R2 Logos (`/api/v1/stores`)
- `GET /api/v1/stores`: List stores (`?slug=`, `?owner_id=`).
- `POST /api/v1/stores`: Create a new store and grant `seller` role to the creator.
- `GET /api/v1/stores/:id`: Get store details by ID or slug.
- `PUT /api/v1/stores/:id`: Update store configuration and payment instructions (Store Owner / Admin).
- `PUT /api/v1/stores/:id/logo`: Upload store logo to R2 (Store Owner / Admin).
- `GET /api/v1/stores/:id/logo`: Stream store logo from R2.
- `GET /api/v1/stores/:id/waves/active`: Get active pre-order waves and available wave products for a store.

### Master Product Catalog (`/api/v1/products`)
- `GET /api/v1/products`: List products (`?store_id=`, `?search=`, `?include_archived=`).
- `GET /api/v1/products/:id`: Get product details with review summary.
- `POST /api/v1/products`: Create master product (Store Owner / Admin).
- `PUT /api/v1/products/:id`: Update product metadata / `base_price` (Store Owner / Admin).
- `PATCH /api/v1/products/:id/archive`: Soft-archive or unarchive product (Store Owner / Admin).
- `PUT /api/v1/products/:id/image`: Upload product image to R2 (Store Owner / Admin).
- `GET /api/v1/products/:id/image`: Stream product image from R2.
- `GET /api/v1/products/:id/reviews`: List customer reviews for a product.

### Pre-Order Waves (`/api/v1/waves`)
- `GET /api/v1/waves`: List waves (`?store_id=`, `?status=`).
- `GET /api/v1/waves/active`: List active waves (`?store_id=`) with product snapshots, locked prices, and remaining quotas.
- `GET /api/v1/waves/:id`: Get wave details and included `wave_products`.
- `POST /api/v1/waves`: Create wave in `Draft` status (Store Owner / Admin).
- `PUT /api/v1/waves/:id`: Update wave name and dates (Store Owner / Admin).
- `PATCH /api/v1/waves/:id/status`: Transition wave status (`Draft` -> `Active` -> `Closed`) (Store Owner / Admin).
- `POST /api/v1/waves/:id/products`: Attach or update product snapshot (`locked_price`, `quota`) in a wave (Store Owner / Admin).
- `DELETE /api/v1/waves/:id/products/:wave_product_id`: Remove product from a wave (Store Owner / Admin).

### Checkout, Orders, Kanban & Public Tracking (`/api/v1/orders`, `/api/v1/track`)
- `POST /api/v1/orders/checkout`: Submit Member or Guest order for an active wave (with auto-generated human-readable `slug` like `DAPU-261118-A7K9` or custom `slug`), enforce quotas, and return store `payment_instructions` + `whatsapp_redirect_url`.
- `GET /api/v1/orders/lookup`: Guest/Customer order history lookup by phone/WhatsApp number (`?phone=` or `?whatsapp=`, optional `?store_id=`).
- `GET /api/v1/orders`: List orders (`?store_id=`, `?wave_id=`, `?status=`, `?view=kanban`) (Store Owner / Admin).
- `GET /api/v1/orders/:id`: Get detailed order record by Order Slug or UUID.
- `PATCH /api/v1/orders/:id/status`: Advance order status (`Received` -> `In Preparation` -> `Waiting for Shipment` -> `On Shipping` -> `Delivered` -> `Received by Customer`) and record `tracking_number` by Order Slug or UUID (Store Owner / Admin).
- `PUT /api/v1/orders/:id/receipt`: Upload payment transfer receipt image to R2 by Order Slug or UUID.
- `GET /api/v1/orders/:id/receipt`: Stream payment receipt image from R2 by Order Slug or UUID.
- `GET /api/v1/track` & `GET /api/v1/track/lookup`: Guest/Customer order history lookup by phone/WhatsApp number (`?phone=` or `?whatsapp=`, optional `?store_id=`).
- `GET /api/v1/track/:id`: Public order tracking timeline by Order Slug (e.g. `DAPU-261118-A7K9`) or UUID.
- `PATCH /api/v1/track/:id/confirm-received`: Confirm delivery receipt (`Delivered` -> `Received by Customer`) by Order Slug or UUID.

### Post-Delivery Reviews (`/api/v1/reviews`)
- `POST /api/v1/reviews`: Submit a 1–5 star product review once order status is `Received by Customer` (Member / Admin).
