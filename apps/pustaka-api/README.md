# Pustaka API (`@niwa/pustaka-api`)

**Pustaka** is a self-hosted, lightweight mini-library and reading progress tracking REST API built for personal and household use within the `niwa` monorepo. It is engineered for edge deployments on **Cloudflare Workers** using **Hono**, **Cloudflare D1 (SQLite)**, **Cloudflare R2**, **Drizzle ORM**, and **Zod**.

---

## Table of Contents

1. [Architecture & Tech Stack](#1-architecture--tech-stack)
2. [Getting Started (Local Development)](#2-getting-started-local-development)
3. [Credentials & Production Deployment](#3-credentials--production-deployment)
4. [Authentication & Edge RBAC](#4-authentication--edge-rbac)
5. [Database Schema (Cloudflare D1)](#5-database-schema-cloudflare-d1)
6. [API Reference (`/api/v1`)](#6-api-reference-apiv1)
   - [Health Check](#health-check)
   - [Auth & Users](#auth--users)
   - [Bookshelves](#bookshelves)
   - [Books Inventory](#books-inventory)
   - [Book Covers (Cloudflare R2)](#book-covers-cloudflare-r2)
   - [Reading Lists](#reading-lists)
   - [Reading Progress](#reading-progress)
   - [Book Reviews](#book-reviews)
7. [Error Format & Status Codes](#7-error-format--status-codes)

---

## 1. Architecture & Tech Stack

- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API `crypto.subtle` PBKDF2-HMAC-SHA256 & `crypto.randomUUID()`)
- **Framework**: [Hono v4](https://hono.dev/) (`hono`, `hono/jwt`, `@hono/zod-validator`)
- **Database**: Cloudflare D1 (Serverless SQLite) + [Drizzle ORM](https://orm.drizzle.team/)
- **Object Storage**: Cloudflare R2 (`BUCKET` binding for book cover uploads and streaming)
- **Shared Validation**: `@niwa/pustaka-validators` (`packages/validators/pustaka`) powered by Zod

```
niwa/
├── apps/
│   └── pustaka-api/                 # Hono + Cloudflare Workers API
│       ├── drizzle/                 # Generated SQLite D1 migrations
│       ├── src/
│       │   ├── db/
│       │   │   ├── index.ts         # Drizzle D1 instance factory
│       │   │   ├── schema.ts        # 10 D1 SQLite table definitions
│       │   │   └── rbac.ts          # Default roles, permissions & seeding
│       │   ├── middleware/
│       │   │   ├── auth.ts          # Bearer JWT verification & user resolution
│       │   │   └── rbac.ts          # Role & permission guard middlewares
│       │   ├── routes/
│       │   │   ├── auth.ts          # /register, /login, /profile
│       │   │   ├── users.ts         # /profile, /:id/roles
│       │   │   ├── bookshelves.ts   # Bookshelves CRUD
│       │   │   ├── books.ts         # Books CRUD, location move, R2 covers, reviews
│       │   │   └── me.ts            # Personal reading list & page progress
│       │   ├── utils/
│       │   │   └── password.ts      # Web Crypto PBKDF2-SHA256 hashing
│       │   ├── types.ts             # Hono Bindings & Variables types
│       │   └── index.ts             # Application entry & route mounting
│       ├── drizzle.config.ts
│       └── wrangler.toml
└── packages/
    └── validators/
        └── pustaka/                 # Shared Zod validation schemas (@niwa/pustaka-validators)
```

---

## 2. Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- `pnpm@10.32.1`

### 1. Install Dependencies
From the monorepo root:
```bash
pnpm install
```

### 2. Configure Local Secrets (Optional)
Copy `.dev.vars.example` to `.dev.vars` inside `apps/pustaka-api`:
```bash
cp apps/pustaka-api/.dev.vars.example apps/pustaka-api/.dev.vars
```
Edit `apps/pustaka-api/.dev.vars`:
```dotenv
JWT_SECRET="replace-with-a-secure-random-32-byte-secret"
ADMIN_EMAIL="admin@example.com"
```

### 3. Apply Local D1 Migrations
```bash
pnpm --filter @niwa/pustaka-api db:migrate:local
```

### 4. Start the Development Server
From the monorepo root:
```bash
pnpm dev:pustaka
```
Or inside `apps/pustaka-api`:
```bash
pnpm dev
```

---

## 3. Credentials & Production Deployment

When deploying to your Cloudflare account:

1. **Authenticate Wrangler**:
   ```bash
   pnpm --filter @niwa/pustaka-api exec wrangler login
   ```
2. **Create Production D1 Database**:
   ```bash
   pnpm --filter @niwa/pustaka-api exec wrangler d1 create pustaka-db
   ```
   Copy the `database_id` from the output into `apps/pustaka-api/wrangler.toml` under `[[d1_databases]]`.
3. **Apply Migrations to Remote D1**:
   ```bash
   pnpm --filter @niwa/pustaka-api db:migrate:remote
   ```
4. **Create Production R2 Bucket**:
   ```bash
   pnpm --filter @niwa/pustaka-api exec wrangler r2 bucket create pustaka-covers
   ```
5. **Store Production Secrets**:
   ```bash
   pnpm --filter @niwa/pustaka-api exec wrangler secret put JWT_SECRET
   ```
6. **Deploy Worker**:
   ```bash
   pnpm --filter @niwa/pustaka-api deploy
   ```

---

## 4. Authentication & Edge RBAC

Protected endpoints require a Bearer JWT in the `Authorization` header:
```http
Authorization: Bearer <jwt_token>
```

### Roles & Permissions

| Role | Granted Permissions | Capabilities |
| :--- | :--- | :--- |
| **`admin`** | `inventory:read`, `inventory:write`, `reading:manage`, `reviews:write`, `users:manage` | Full control over bookshelves, books, cover uploads, and user role assignments. |
| **`member`** | `inventory:read`, `reading:manage`, `reviews:write` | Browse/search inventory, manage personal reading lists, track page progress, and post reviews. |

> **Admin Bootstrap**: On a fresh database, the **first registered user** (or any user registering with the email configured in `ADMIN_EMAIL`) is automatically granted both `admin` and `member` roles. Subsequent registrations default to `member` and can be promoted by an Admin via `POST /api/v1/users/:id/roles`.

---

## 5. Database Schema (Cloudflare D1)

All primary keys (`id`) are UUIDv4 strings (`TEXT`) generated via `crypto.randomUUID()`. Timestamps (`created_at`, `updated_at`) are stored as Unix epoch seconds (`INTEGER`).

| Table | Columns |
| :--- | :--- |
| `users` | `id` (PK), `username`, `email` (Unique), `password_hash`, `created_at` |
| `roles` | `id` (PK), `name` (Unique), `description` |
| `user_roles` | `user_id` (FK -> `users.id`), `role_id` (FK -> `roles.id`) — Composite PK |
| `permissions` | `id` (PK), `slug` (Unique), `description` |
| `role_permissions` | `role_id` (FK -> `roles.id`), `permission_id` (FK -> `permissions.id`) — Composite PK |
| `bookshelves` | `id` (PK), `name`, `location` |
| `books` | `id` (PK), `title`, `author`, `isbn` (Unique), `total_pages`, `cover_image_key` (Nullable), `bookshelf_id` (FK -> `bookshelves.id`) |
| `reading_lists` | `id` (PK), `user_id` (FK -> `users.id`), `book_id` (FK -> `books.id`), `status`, `updated_at` — Unique `(user_id, book_id)` |
| `reading_progress` | `id` (PK), `user_id` (FK -> `users.id`), `book_id` (FK -> `books.id`), `last_page_read`, `updated_at` — Unique `(user_id, book_id)` |
| `book_reviews` | `id` (PK), `user_id` (FK -> `users.id`), `book_id` (FK -> `books.id`), `rating`, `review_text` |

---

## 6. API Reference (`/api/v1`)

### Health Check

#### `GET /`
Returns service health status.

**Response (`200 OK`)**
```json
{
  "service": "pustaka-api",
  "status": "ok"
}
```

---

### Auth & Users

#### `POST /api/v1/auth/register` (alias: `POST /api/v1/register`)
Creates a new user account and returns a signed JWT (valid for 7 days).

- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "hendra",
    "email": "hendra@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Validation Rules**:
  - `username`: string, 3–50 characters
  - `email`: valid email address
  - `password`: string, 8–128 characters
- **Response (`201 Created`)**:
  ```json
  {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "hendra",
      "email": "hendra@example.com",
      "roles": ["member", "admin"],
      "permissions": [
        "inventory:read",
        "inventory:write",
        "reading:manage",
        "reviews:write",
        "users:manage"
      ],
      "created_at": 1763198400
    },
    "token": "<jwt_token>"
  }
  ```

---

#### `POST /api/v1/auth/login` (alias: `POST /api/v1/login`)
Authenticates an existing user and issues a signed JWT.

- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "hendra@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "hendra",
      "email": "hendra@example.com",
      "roles": ["member", "admin"],
      "permissions": [
        "inventory:read",
        "inventory:write",
        "reading:manage",
        "reviews:write",
        "users:manage"
      ],
      "created_at": 1763198400
    },
    "token": "<jwt_token>"
  }
  ```

---

#### `GET /api/v1/users/profile` (aliases: `GET /api/v1/auth/profile`, `GET /api/v1/profile`)
Retrieves the currently authenticated user's profile, roles, and resolved permissions.

- **Access**: Authenticated (`member` or `admin`)
- **Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "hendra",
      "email": "hendra@example.com",
      "roles": ["member", "admin"],
      "permissions": [
        "inventory:read",
        "inventory:write",
        "reading:manage",
        "reviews:write",
        "users:manage"
      ]
    }
  }
  ```

---

#### `POST /api/v1/users/:id/roles`
Assigns a role (`admin` or `member`) to a target user.

- **Access**: Admin (`users:manage`)
- **Request Body**:
  ```json
  {
    "role": "admin"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "8f9d2a11-4c3b-4e8a-9a12-112233445566",
      "username": "reader",
      "email": "reader@example.com",
      "roles": ["member", "admin"],
      "permissions": [
        "inventory:read",
        "inventory:write",
        "reading:manage",
        "reviews:write",
        "users:manage"
      ]
    }
  }
  ```

---

### Bookshelves

#### `GET /api/v1/bookshelves`
Lists all bookshelves in the library.

- **Access**: Authenticated (`member` or `admin`)
- **Response (`200 OK`)**:
  ```json
  {
    "bookshelves": [
      {
        "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "name": "Study Room Shelf A",
        "location": "2nd Floor Study"
      }
    ]
  }
  ```

---

#### `GET /api/v1/bookshelves/:id`
Retrieves a single bookshelf by ID.

- **Access**: Authenticated (`member` or `admin`)
- **Response (`200 OK`)**:
  ```json
  {
    "bookshelf": {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "name": "Study Room Shelf A",
      "location": "2nd Floor Study"
    }
  }
  ```

---

#### `POST /api/v1/bookshelves`
Creates a new bookshelf location.

- **Access**: Admin (`admin` role)
- **Request Body**:
  ```json
  {
    "name": "Study Room Shelf A",
    "location": "2nd Floor Study"
  }
  ```
- **Validation Rules**:
  - `name`: string, 1–100 characters
  - `location`: string, 1–255 characters
- **Response (`201 Created`)**:
  ```json
  {
    "bookshelf": {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "name": "Study Room Shelf A",
      "location": "2nd Floor Study"
    }
  }
  ```

---

### Books Inventory

#### `GET /api/v1/books`
Lists books in the inventory with optional search and bookshelf filtering.

- **Access**: Authenticated (`member` or `admin`)
- **Query Parameters** (optional):
  - `search`: Matches `title`, `author`, or `isbn` (`LIKE %search%`)
  - `bookshelf_id`: Filters books on a specific bookshelf
- **Example**: `GET /api/v1/books?search=Kernighan&bookshelf_id=a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d`
- **Response (`200 OK`)**:
  ```json
  {
    "books": [
      {
        "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
        "title": "The C Programming Language",
        "author": "Brian W. Kernighan & Dennis M. Ritchie",
        "isbn": "9780131103627",
        "total_pages": 272,
        "cover_image_key": "covers/b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e/9a8b7c6d.png",
        "bookshelf_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "bookshelf": {
          "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
          "name": "Study Room Shelf A",
          "location": "2nd Floor Study"
        }
      }
    ]
  }
  ```

---

#### `GET /api/v1/books/:id`
Retrieves metadata and bookshelf location for a single book.

- **Access**: Authenticated (`member` or `admin`)
- **Response (`200 OK`)**:
  ```json
  {
    "book": {
      "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "title": "The C Programming Language",
      "author": "Brian W. Kernighan & Dennis M. Ritchie",
      "isbn": "9780131103627",
      "total_pages": 272,
      "cover_image_key": null,
      "bookshelf_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "bookshelf": {
        "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "name": "Study Room Shelf A",
        "location": "2nd Floor Study"
      }
    }
  }
  ```

---

#### `POST /api/v1/books`
Adds a new book to the library inventory.

- **Access**: Admin (`admin` role)
- **Request Body**:
  ```json
  {
    "title": "The C Programming Language",
    "author": "Brian W. Kernighan & Dennis M. Ritchie",
    "isbn": "9780131103627",
    "total_pages": 272,
    "bookshelf_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
  }
  ```
- **Validation Rules**:
  - `title`: string, 1–255 characters
  - `author`: string, 1–255 characters
  - `isbn`: unique string, 10–20 characters
  - `total_pages`: positive integer (`> 0`)
  - `bookshelf_id`: existing bookshelf ID
- **Response (`201 Created`)**:
  ```json
  {
    "book": {
      "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "title": "The C Programming Language",
      "author": "Brian W. Kernighan & Dennis M. Ritchie",
      "isbn": "9780131103627",
      "total_pages": 272,
      "cover_image_key": null,
      "bookshelf_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
    }
  }
  ```

---

#### `PUT /api/v1/books/:id`
Updates a book's metadata (`title`, `author`, `isbn`, `total_pages`, or `bookshelf_id`).

- **Access**: Admin (`admin` role)
- **Request Body** (all fields optional):
  ```json
  {
    "title": "The C Programming Language (2nd Edition)",
    "total_pages": 300
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "book": {
      "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "title": "The C Programming Language (2nd Edition)",
      "author": "Brian W. Kernighan & Dennis M. Ritchie",
      "isbn": "9780131103627",
      "total_pages": 300,
      "cover_image_key": null,
      "bookshelf_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
    }
  }
  ```

---

#### `PATCH /api/v1/books/:id/location`
Moves a book to a different bookshelf.

- **Access**: Admin (`admin` role)
- **Request Body**:
  ```json
  {
    "bookshelf_id": "f1e2d3c4-b5a6-4987-8c7d-6e5f4a3b2c1d"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "book": {
      "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "title": "The C Programming Language (2nd Edition)",
      "author": "Brian W. Kernighan & Dennis M. Ritchie",
      "isbn": "9780131103627",
      "total_pages": 300,
      "cover_image_key": null,
      "bookshelf_id": "f1e2d3c4-b5a6-4987-8c7d-6e5f4a3b2c1d"
    }
  }
  ```

---

#### `DELETE /api/v1/books/:id`
Deletes a book from D1 and removes its cover image from R2 (if present).

- **Access**: Admin (`admin` role)
- **Response (`200 OK`)**:
  ```json
  {
    "message": "Book deleted successfully",
    "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e"
  }
  ```

---

### Book Covers (Cloudflare R2)

#### `PUT /api/v1/books/:id/cover`
Uploads a book cover image to the bound Cloudflare R2 bucket (`BUCKET`) and updates `cover_image_key` in D1. If the book already had a cover, the old R2 object is automatically deleted.

- **Access**: Admin (`admin` role)
- **Supported Upload Formats**:
  - `multipart/form-data` with a file field named `cover` (or `file`)
  - Direct binary body with `Content-Type: image/jpeg | image/png | image/webp | image/gif | image/avif`
- **Size Limit**: 10 MB
- **`curl` Example**:
  ```bash
  curl -X PUT "http://localhost:8787/api/v1/books/<book_id>/cover" \
    -H "Authorization: Bearer <admin_jwt_token>" \
    -F "cover=@./cover.png;type=image/png"
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "book": {
      "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "title": "The C Programming Language (2nd Edition)",
      "author": "Brian W. Kernighan & Dennis M. Ritchie",
      "isbn": "9780131103627",
      "total_pages": 300,
      "cover_image_key": "covers/b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e/3f4e5d6c-7b8a-4912-9a0b-1c2d3e4f5a6b.png",
      "bookshelf_id": "f1e2d3c4-b5a6-4987-8c7d-6e5f4a3b2c1d"
    },
    "cover_image_key": "covers/b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e/3f4e5d6c-7b8a-4912-9a0b-1c2d3e4f5a6b.png"
  }
  ```

---

#### `GET /api/v1/books/:id/cover`
Streams the book's cover image directly from Cloudflare R2.

- **Access**: Public
- **Response Headers**:
  - `Content-Type`: `image/png` (or uploaded MIME type)
  - `ETag`: R2 object HTTP ETag
  - `Cache-Control`: `public, max-age=3600`
- **Response (`200 OK`)**: Binary image stream.

---

### Reading Lists

#### `GET /api/v1/me/reading-list`
Retrieves the authenticated user's personal reading list with embedded book details.

- **Access**: Authenticated (`reading:manage`)
- **Response (`200 OK`)**:
  ```json
  {
    "reading_list": [
      {
        "id": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
        "status": "reading",
        "updated_at": 1763199000,
        "book": {
          "id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
          "title": "The C Programming Language (2nd Edition)",
          "author": "Brian W. Kernighan & Dennis M. Ritchie",
          "isbn": "9780131103627",
          "total_pages": 300,
          "cover_image_key": "covers/b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e/3f4e5d6c.png",
          "bookshelf_id": "f1e2d3c4-b5a6-4987-8c7d-6e5f4a3b2c1d"
        }
      }
    ]
  }
  ```

---

#### `POST /api/v1/me/reading-list`
Adds a book to the authenticated user's reading list.

- **Access**: Authenticated (`reading:manage`)
- **Allowed `status` values**: `"want_to_read"` (default), `"reading"`, `"completed"`, `"on_hold"`, `"dropped"`
- **Request Body**:
  ```json
  {
    "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
    "status": "want_to_read"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "reading_list_item": {
      "id": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "status": "want_to_read",
      "updated_at": 1763198800
    }
  }
  ```

---

#### `PATCH /api/v1/me/reading-list/:book_id`
Updates the status of a book on the user's reading list.

- **Access**: Authenticated (`reading:manage`)
- **Request Body**:
  ```json
  {
    "status": "reading"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "reading_list_item": {
      "id": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "status": "reading",
      "updated_at": 1763199000
    }
  }
  ```

---

### Reading Progress

#### `GET /api/v1/me/progress/:book_id`
Retrieves the authenticated user's reading progress for a specific book.

- **Access**: Authenticated (`reading:manage`)
- **Response (`200 OK`)**:
  ```json
  {
    "progress": {
      "id": "d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "last_page_read": 150,
      "total_pages": 300,
      "percentage": 50,
      "updated_at": 1763199200
    }
  }
  ```

---

#### `PUT /api/v1/me/progress/:book_id`
Updates `last_page_read` for a book. Enforces the mathematical invariant `0 <= last_page_read <= book.total_pages`.

- **Access**: Authenticated (`reading:manage`)
- **Request Body**:
  ```json
  {
    "last_page_read": 150
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "progress": {
      "id": "d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "last_page_read": 150,
      "total_pages": 300,
      "percentage": 50,
      "updated_at": 1763199200
    }
  }
  ```
- **Error Response (`400 Bad Request` when `last_page_read > total_pages`)**:
  ```json
  {
    "error": "BadRequest",
    "message": "last_page_read (450) cannot exceed book total_pages (300)"
  }
  ```

---

### Book Reviews

#### `GET /api/v1/books/:id/reviews`
Lists all reviews and ratings for a book.

- **Access**: Authenticated (`member` or `admin`)
- **Response (`200 OK`)**:
  ```json
  {
    "reviews": [
      {
        "id": "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "hendra",
        "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
        "rating": 5,
        "review_text": "A timeless masterpiece of technical writing."
      }
    ]
  }
  ```

---

#### `POST /api/v1/books/:id/reviews`
Adds a review and rating (`1`–`5`) for a book.

- **Access**: Authenticated (`reviews:write`)
- **Request Body**:
  ```json
  {
    "rating": 5,
    "review_text": "A timeless masterpiece of technical writing."
  }
  ```
- **Validation Rules**:
  - `rating`: integer, `1 <= rating <= 5`
  - `review_text`: string, 1–2000 characters
- **Response (`201 Created`)**:
  ```json
  {
    "review": {
      "id": "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "book_id": "b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e",
      "rating": 5,
      "review_text": "A timeless masterpiece of technical writing.",
      "username": "hendra"
    }
  }
  ```

---

## 7. Error Format & Status Codes

All domain and middleware errors return a consistent JSON structure:

```json
{
  "error": "Forbidden",
  "message": "Insufficient role privileges. Required: admin"
}
```

Zod validation errors from `@hono/zod-validator` return `400 Bad Request` with detailed field-level issues.

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `BadRequest` / Zod Error | Invalid request body/query/params, unsupported image MIME type, or `last_page_read > total_pages`. |
| `401` | `Unauthorized` | Missing, malformed, or expired Bearer JWT token, or invalid login credentials. |
| `403` | `Forbidden` | Authenticated user lacks required role (`admin`) or permission slug. |
| `404` | `NotFound` | Requested book, bookshelf, cover image, reading list item, or user does not exist. |
| `409` | `Conflict` | Duplicate user `email`, duplicate book `isbn`, or book already on user's reading list. |
