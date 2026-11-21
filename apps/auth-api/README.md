# Niwa Auth API (`@niwa/auth-api`)

Centralized first-party **Identity Provider (IdP)**, **Single Sign-On (SSO)**, and **Multi-App RBAC/ACL** service for the `niwa` monorepo. Built for **Cloudflare Workers** using **Hono v4**, **Cloudflare D1 (SQLite)**, **Drizzle ORM**, **Zod v4**, and **`jose`** (`ES256` + JWKS).

---

## 1. Tech Stack

- **Runtime**: Cloudflare Workers (Edge Runtime, Web Crypto API)
- **Framework**: [Hono v4](https://hono.dev/) (`hono`, `@hono/zod-validator`)
- **Database**: Cloudflare D1 (`niwa-auth-db`) + [Drizzle ORM](https://orm.drizzle.team/)
- **Token Signing**: Asymmetric `ES256` (ECDSA P-256) via [`jose`](https://github.com/panva/jose) with public key discovery at `/.well-known/jwks.json`
- **Shared Validation**: `@niwa/auth-validators` (`packages/validators/auth`)

---

## 2. Environment Variables & Generating `JWT_*` Keys

### Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `JWT_PRIVATE_KEY_JWK` | Yes | — | Active EC P-256 private key in JWK JSON format (store as a Wrangler secret in production). |
| `JWT_ACTIVE_KID` | No | `kid` from JWK | Active Key ID emitted in the JWT header and `/.well-known/jwks.json` (e.g. `niwa-es256-2026-11`). |
| `JWT_PUBLIC_JWKS_EXTRA` | No | — | Optional JSON array of previous **public** JWKs kept during a key rotation grace window. |
| `JWT_ISSUER` | No | `https://auth.api.hendrasadewa.com` | Expected `iss` claim in signed JWTs and discovery metadata. |
| `AUTH_WEB_URL` | No | `https://auth.hendrasadewa.com` | Hosted Auth Portal base URL used for consent redirects and origin checks (`http://localhost:3003` in local dev). |
| `ALLOWED_ORIGINS` | No | — | Optional comma-separated extra web origins allowed by strict CORS. |
| `ADMIN_EMAIL` | No | — | Email address automatically granted admin roles on registration. |
| `ACCESS_TOKEN_TTL_SECONDS` | No | `300` | Short-lived access JWT lifetime in seconds (5 minutes). |
| `IDP_SESSION_TTL_SECONDS` | No | `2592000` | Sliding `__Host-niwa_session` cookie / `idp_sessions` TTL in seconds (30 days). |
| `REFRESH_TOKEN_TTL_SECONDS` | No | `2592000` | Legacy refresh token TTL in seconds (30 days). |

### Generating an `ES256` Keypair (`JWT_ACTIVE_KID` & `JWT_PRIVATE_KEY_JWK`)

Run this Node.js one-liner (uses built-in Web Crypto, no extra packages required):

```bash
node -e '
(async () => {
  const kid = `niwa-es256-${new Date().toISOString().slice(0, 7)}`;
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const priv = await crypto.subtle.exportKey("jwk", privateKey);
  const pub = await crypto.subtle.exportKey("jwk", publicKey);

  const privateJwk = {
    kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, d: priv.d,
    kid, alg: "ES256", use: "sig"
  };
  const publicJwk = {
    kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y,
    kid, alg: "ES256", use: "sig"
  };

  console.log(`JWT_ACTIVE_KID="${kid}"`);
  console.log(`JWT_PRIVATE_KEY_JWK=\x27${JSON.stringify(privateJwk)}\x27`);
  console.log("\n# Public JWK (save this for JWT_PUBLIC_JWKS_EXTRA during future key rotations):");
  console.log(JSON.stringify([publicJwk]));
})();
'
```

### Local Development (`.dev.vars`)

Copy `.dev.vars.example` to `.dev.vars` and paste your generated values (always use `http://localhost:<port>`, never `127.0.0.1`, so `SameSite=Lax` cookies work consistently):

```dotenv
JWT_ISSUER="https://auth.api.hendrasadewa.com"
JWT_ACTIVE_KID="niwa-es256-2026-11"
JWT_PRIVATE_KEY_JWK='{"kty":"EC","crv":"P-256","x":"...","y":"...","d":"...","kid":"niwa-es256-2026-11","alg":"ES256","use":"sig"}'
AUTH_WEB_URL="http://localhost:3003"
ADMIN_EMAIL="admin@example.com"
```

### Production Secrets (Cloudflare Workers)

Never commit production private keys to `wrangler.toml`. Set them as encrypted Wrangler secrets:

```bash
pnpm --filter @niwa/auth-api exec wrangler secret put JWT_PRIVATE_KEY_JWK
pnpm --filter @niwa/auth-api exec wrangler secret put JWT_ACTIVE_KID
```

> When prompted for `JWT_PRIVATE_KEY_JWK`, paste the raw JSON object **without** outer single quotes.

### Zero-Downtime Key Rotation (`JWT_PUBLIC_JWKS_EXTRA`)

1. Generate a new keypair with a new `kid` (e.g. `niwa-es256-2027-01`).
2. Put the **previous public JWK** (without `"d"`) into `JWT_PUBLIC_JWKS_EXTRA` as a JSON array:
   ```bash
   pnpm --filter @niwa/auth-api exec wrangler secret put JWT_PUBLIC_JWKS_EXTRA
   # Paste: [{"kty":"EC","crv":"P-256","x":"...","y":"...","kid":"niwa-es256-2026-11","alg":"ES256","use":"sig"}]
   ```
3. Update `JWT_PRIVATE_KEY_JWK` and `JWT_ACTIVE_KID` to the new keypair.
4. Keep `JWT_PUBLIC_JWKS_EXTRA` set for at least 2× the access token TTL (10+ minutes) so in-flight tokens signed with the previous key still verify via `/.well-known/jwks.json`, then remove it.

### Downstream APIs (`@niwa/open-po-api`, `@niwa/pustaka-api`)

Downstream resource servers do **not** require private keys or a shared `JWT_SECRET`. They only need:
- `AUTH_API` Cloudflare Service Binding (or `AUTH_API_URL="http://localhost:8788"` locally) to fetch `/.well-known/jwks.json`
- `JWT_ISSUER="https://auth.api.hendrasadewa.com"`

---

## 3. Getting Started (Local Development)

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Apply local D1 migrations
pnpm --filter @niwa/auth-api db:migrate:local

# 3. Start the dev server on http://localhost:8788
pnpm dev:auth
```

Useful scripts:
- `pnpm --filter @niwa/auth-api db:generate` — Generate Drizzle SQL migrations from `src/db/schema.ts`
- `pnpm --filter @niwa/auth-api db:migrate:local` — Apply D1 migrations locally
- `pnpm --filter @niwa/auth-api db:migrate:remote` — Apply D1 migrations to remote D1
- `pnpm --filter @niwa/auth-api typecheck` — Run TypeScript typechecking
- `pnpm --filter @niwa/auth-api deploy` — Deploy to Cloudflare Workers

---

## 4. API Surface Overview

- **Discovery (`/.well-known`)**:
  - `GET /.well-known/jwks.json` — Public EC P-256 JWKS (`Cache-Control: public, max-age=3600`)
  - `GET /.well-known/openid-configuration` — Issuer & endpoint discovery metadata
- **First-Party SSO (`/api/v1/sso`)** *(cookie-authenticated, CSRF-protected via `X-Niwa-Requested-With: fetch`)*:
  - `POST /api/v1/sso/token` — Silent session check & app-scoped `ES256` access JWT exchange
  - `POST /api/v1/sso/consent` — Approve or deny first-time app access (`auth.hendrasadewa.com` only)
  - `POST /api/v1/sso/logout` — Global Single Logout (revokes IdP session and clears `__Host-niwa_session`)
- **Account Portal (`/api/v1/account`)**:
  - `GET /api/v1/account/me`, `PUT /api/v1/account/me`, `PUT /api/v1/account/password`
  - `GET /api/v1/account/sessions`, `DELETE /api/v1/account/sessions/:id`, `POST /api/v1/account/sessions/revoke-all`
  - `GET /api/v1/account/apps`, `DELETE /api/v1/account/apps/:appId`
- **Authentication (`/api/v1/auth`)**:
  - `POST /register`, `POST /login` *(also sets `__Host-niwa_session` / `niwa_session` cookie)*, `POST /refresh`, `POST /logout`, `POST /logout-all`, `GET /sessions`, `PUT /password`, `GET /me`, `PUT /me`, `POST /roles/grant`, `POST /roles/revoke`
- **Admin ACL (`/api/v1/acl`)** *(admin role required)*:
  - `/apps` (`GET`, `POST`, `PUT /:appId`), `/roles`, `/permissions`, `/users`
