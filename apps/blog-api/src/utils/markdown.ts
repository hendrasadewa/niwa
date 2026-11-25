/**
 * Pure Markdown utilities: plain-text extraction (for site.standard.document.textContent),
 * slugification, reading time estimation, and default Bluesky teaser generation.
 */

export function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return cleaned || `post-${Date.now().toString(36)}`;
}

export function stripMarkdownToPlainText(markdown: string): string {
  return markdown
    // Remove fenced code block markers while preserving readable code text
    .replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, "\n$1\n")
    // Convert images to their alt text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Convert markdown links to link label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove headings, blockquotes, horizontal rules, list markers
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*([-*_]){3,}\s*$/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Remove bold/italic/strikethrough delimiters
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    // Strip raw HTML tags
    .replace(/<[^>]+>/g, "")
    // Normalize whitespace
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateReadingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function buildExcerpt(description: string, plainText: string, maxLength = 220): string {
  const source = description.trim() || plainText.replace(/\s+/g, " ").trim();
  if (source.length <= maxLength) return source;
  return `${source.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizePostPath(slug: string): string {
  const clean = slug.replace(/^\/+/, "").replace(/^p\//, "");
  return `/p/${clean}`;
}

export function extractSlugFromPath(path: string | undefined, fallbackRkey: string): string {
  if (!path) return fallbackRkey;
  const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (trimmed.startsWith("p/")) {
    return trimmed.slice(2) || fallbackRkey;
  }
  return trimmed || fallbackRkey;
}

export function buildDefaultBskyTeaser(opts: {
  title: string;
  description?: string;
  tags?: string[];
}): string {
  const parts: string[] = [opts.title.trim()];
  if (opts.description?.trim()) {
    parts.push(opts.description.trim());
  }
  const tagLine = (opts.tags ?? [])
    .slice(0, 3)
    .map((t) => `#${t.replace(/[^a-zA-Z0-9_]/g, "")}`)
    .filter((t) => t.length > 1)
    .join(" ");
  if (tagLine) {
    parts.push(tagLine);
  }
  const joined = parts.join("\n\n");
  // Bluesky post limit is 300 graphemes; keep conservative margin
  const chars = Array.from(joined);
  if (chars.length <= 290) return joined;
  return `${chars.slice(0, 289).join("").trimEnd()}…`;
}
