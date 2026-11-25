import { renderMarkdownToHtml } from "@/lib/markdown";
import {
  getPublicPostsFull,
  getPublicPublication,
  PUBLIC_SITE_URL,
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapCdata(input: string): string {
  return `<![CDATA[${input.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const [publication, posts] = await Promise.all([
    getPublicPublication(),
    getPublicPostsFull(),
  ]);

  const siteUrl = (publication?.url || PUBLIC_SITE_URL).replace(/\/+$/, "");
  const siteTitle = publication?.name || "Hendra Sadewa";
  const siteDescription =
    publication?.description ||
    "Micro-essays, engineering notes, and TILs published on ATProto via Standard.site.";

  const itemsXml = await Promise.all(
    posts.slice(0, 50).map(async (post) => {
      const link = `${siteUrl}${post.path}`;
      const html = await renderMarkdownToHtml(post.markdown);
      const pubDate = new Date(post.publishedAt).toUTCString();
      const categories = post.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join("\n");

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <content:encoded>${wrapCdata(html)}</content:encoded>
${categories}
    </item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
${itemsXml.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
