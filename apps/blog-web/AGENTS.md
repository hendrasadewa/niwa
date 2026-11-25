# Blog Web App — Agent Context (`@niwa/blog-web`)

## 1. Overview & Architecture
- **App Name**: `@niwa/blog-web` (`apps/blog-web`, Worker: `niwa-blog-web`, dev port `3004`)
- **Purpose**: Single-author ATProto (`standard.site`) personal semi-micro-blogging web app and private Markdown Studio (`https://blog.hendrasadewa.com`).
- **Framework**: Next.js 16 (App Router, `src/app`), React 19, TypeScript, deployed via `@opennextjs/cloudflare` (`wrangler.jsonc`).
- **Styling & UI**:
  - Tailwind CSS v4 (`@tailwindcss/postcss`) with `@niwa/ui/styles/tokens.css`.
  - Shared primitives from `@niwa/ui/primitives`, core components from `@niwa/ui/components`, toast hook from `@niwa/ui/hooks`.
- **Protocol & Data Flow**:
  - Public posts and publication metadata come from `@niwa/blog-api` (via Cloudflare Service Binding `BLOG_API` in production, backed by ATProto PDS + R2 JSON cache).
  - Two-way Standard.site verification via `/.well-known/site.standard.publication` and `<link rel="site.standard.document" href="at://...">`.
  - Live comments/likes/reposts fetched from Bluesky's public AppView (`app.bsky.feed.getPostThread`).
  - Private `/studio` guarded by `@niwa/auth` SSO (`appId: "blog"`, `admin` role required).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
