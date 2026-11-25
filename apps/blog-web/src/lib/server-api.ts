import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  StandardDocumentDto,
  StandardDocumentSummaryDto,
  StandardPublicationDto,
} from "@niwa/blog-validators";

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8791";

export const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://blog.hendrasadewa.com";

interface CloudflareEnvWithBlogApi {
  BLOG_API?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
}

async function fetchBlogApi<T>(path: string): Promise<T | null> {
  let response: Response | null = null;

  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as unknown as CloudflareEnvWithBlogApi;
    if (env?.BLOG_API) {
      response = await env.BLOG_API.fetch(`https://blog-api.internal${path}`, {
        headers: { Accept: "application/json" },
      });
    }
  } catch {
    // Not running inside Cloudflare runtime (e.g. next dev / build) — use HTTP fallback
  }

  if (!response) {
    try {
      response = await fetch(`${DEFAULT_API_URL}${path}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    } catch {
      return null;
    }
  }

  if (response.status === 404) return null;
  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublicPublication(): Promise<StandardPublicationDto | null> {
  const data = await fetchBlogApi<{
    publication: StandardPublicationDto | null;
  }>("/api/v1/public/publication");
  return data?.publication ?? null;
}

export async function getPublicPosts(): Promise<StandardDocumentSummaryDto[]> {
  const data = await fetchBlogApi<{ posts: StandardDocumentSummaryDto[] }>(
    "/api/v1/public/posts"
  );
  return data?.posts ?? [];
}

export async function getPublicPostsFull(): Promise<StandardDocumentDto[]> {
  const data = await fetchBlogApi<{ posts: StandardDocumentDto[] }>(
    "/api/v1/public/posts?full=true"
  );
  return data?.posts ?? [];
}

export async function getPublicPostBySlug(
  slug: string
): Promise<StandardDocumentDto | null> {
  const data = await fetchBlogApi<{ post: StandardDocumentDto }>(
    `/api/v1/public/posts/${encodeURIComponent(slug)}`
  );
  return data?.post ?? null;
}
