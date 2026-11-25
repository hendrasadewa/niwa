# Blog API — Agent Context (`@niwa/blog-api`)

- **App Name**: `@niwa/blog-api` (`apps/blog-api`, Worker: `niwa-blog-api`, dev port `8791`)
- **Purpose**: Private D1 draft storage, R2 inline media & PDS JSON cache, and authenticated ATProto `standard.site` (`site.standard.publication`, `site.standard.document`) + Bluesky (`app.bsky.feed.post`) publishing API.
- **Architecture**: Canonical Niwa Hono v4 + Drizzle ORM + D1 + R2 + `@niwa/api-core` layered architecture (`routes` → `services` → `repositories` → `db`).
- **Source of Truth**:
  - Private unpublished drafts live in Cloudflare D1 (`drafts` table).
  - Published articles live exclusively on your ATProto PDS (`site.standard.document` with `com.hendrasadewa.blog.markdown` content union and plain-text `textContent` fallback) and are cached in R2 under `_cache/*.json` with instant invalidation on publish/edit/unpublish.
- **Auth**:
  - Studio endpoints (`/api/v1/studio/*`) require `@niwa/auth` ES256 JWT (`aud: "blog"`) + `admin` role.
  - PDS write endpoints authenticate server-side via Cloudflare Worker secrets (`BSKY_IDENTIFIER`, `BSKY_APP_PASSWORD`).
