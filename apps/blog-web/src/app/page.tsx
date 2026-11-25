import Link from "next/link";
import { Calendar, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@niwa/ui/primitives";
import { SiteHeader } from "@/components/site-header";
import { getPublicPosts, getPublicPublication } from "@/lib/server-api";

export const dynamic = "force-dynamic";

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

export default async function HomePage() {
  const [publication, posts] = await Promise.all([
    getPublicPublication(),
    getPublicPosts(),
  ]);

  const siteName = publication?.name || "Hendra Sadewa";
  const siteDescription =
    publication?.description ||
    "Micro-essays, engineering notes, and TILs stored natively on ATProto via Standard.site.";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteName={siteName} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <section className="mb-12 border-b border-border pb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Standard.site · ATProto
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {siteName}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {siteDescription}
          </p>
        </section>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <p className="font-serif text-lg font-medium text-foreground">
              No published essays yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Posts published to your ATProto PDS via{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                site.standard.document
              </code>{" "}
              will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <article key={post.uri} className="py-8 first:pt-0">
                <Link href={post.path} className="group block">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <time dateTime={post.publishedAt}>
                            {formatDate(post.publishedAt)}
                          </time>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {post.readingTimeMinutes} min read
                        </span>
                      </div>

                      <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {post.title}
                      </h2>

                      {post.description && (
                        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                          {post.description}
                        </p>
                      )}

                      {post.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="font-normal"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {post.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="h-44 w-full shrink-0 rounded-xl border border-border object-cover sm:h-28 sm:w-40"
                      />
                    )}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            Records stored on ATProto using{" "}
            <a
              href="https://standard.site"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-primary"
            >
              standard.site
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/feed.xml" className="hover:text-foreground">
              RSS Feed
            </Link>
            <Link href="/studio" className="hover:text-foreground">
              Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
