import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Badge } from "@niwa/ui/primitives";
import { BskyCommentsSection } from "@/components/bsky-comments";
import { SiteHeader } from "@/components/site-header";
import { atUriToBskyWebUrl, fetchBskyPostThread } from "@/lib/bsky";
import { renderMarkdownToHtml } from "@/lib/markdown";
import {
  getPublicPostBySlug,
  getPublicPublication,
  PUBLIC_SITE_URL,
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, publication] = await Promise.all([
    getPublicPostBySlug(slug),
    getPublicPublication(),
  ]);

  if (!post) {
    return { title: "Post not found" };
  }

  const siteUrl = (publication?.url || PUBLIC_SITE_URL).replace(/\/+$/, "");
  const canonicalUrl = `${siteUrl}${post.path}`;
  const ogImages = post.coverImageUrl
    ? [{ url: post.coverImageUrl, alt: post.title }]
    : [{ url: `${canonicalUrl}/opengraph-image`, width: 1200, height: 630, alt: post.title }];

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      tags: post.tags,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ogImages.map((img) => img.url),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const [post, publication] = await Promise.all([
    getPublicPostBySlug(slug),
    getPublicPublication(),
  ]);

  if (!post) {
    notFound();
  }

  const [renderedHtml, bskyThread] = await Promise.all([
    renderMarkdownToHtml(post.markdown),
    post.bskyPostRef?.uri
      ? fetchBskyPostThread(post.bskyPostRef.uri)
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* React 19 hoists <link> into <head> for Standard.site two-way document verification */}
      <link rel="site.standard.document" href={post.uri} />

      <SiteHeader siteName={publication?.name || "Hendra Sadewa"} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All essays</span>
        </Link>

        <article className="mt-8">
          <header className="mb-8 border-b border-border pb-8">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <time dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt)}
                </time>
              </span>
              {post.updatedAt && post.updatedAt !== post.publishedAt && (
                <span>· Updated {formatDate(post.updatedAt)}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readingTimeMinutes} min read
              </span>
            </div>

            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              {post.title}
            </h1>

            {post.description && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {post.description}
              </p>
            )}

            {post.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {post.coverImageUrl && (
            <div className="mb-10 overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="max-h-[460px] w-full object-cover"
              />
            </div>
          )}

          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </article>

        {post.bskyPostRef?.uri && (
          <BskyCommentsSection
            thread={bskyThread}
            fallbackBskyUrl={atUriToBskyWebUrl(post.bskyPostRef.uri)}
          />
        )}
      </main>
    </div>
  );
}
