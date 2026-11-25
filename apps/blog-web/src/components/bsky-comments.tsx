import type { BskyThreadPostDto } from "@niwa/blog-validators";
import { ExternalLink, Heart, MessageCircle, Repeat2 } from "lucide-react";

interface BskyCommentsProps {
  thread: BskyThreadPostDto | null;
  fallbackBskyUrl: string;
}

function formatShortDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function ReplyItem({
  reply,
  depth = 0,
}: {
  reply: BskyThreadPostDto;
  depth?: number;
}) {
  return (
    <div
      className={
        depth > 0 ? "ml-4 border-l border-border pl-4 sm:ml-6 sm:pl-5" : ""
      }
    >
      <div className="rounded-xl border border-border/80 bg-card/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {reply.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={reply.author.avatar}
                alt={reply.author.displayName || reply.author.handle}
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {(reply.author.displayName || reply.author.handle)
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {reply.author.displayName || reply.author.handle}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{reply.author.handle}
                {reply.createdAt ? ` · ${formatShortDate(reply.createdAt)}` : ""}
              </p>
            </div>
          </div>

          <a
            href={reply.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
            title="View reply on Bluesky"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {reply.text}
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {reply.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Repeat2 className="h-3.5 w-3.5" />
            {reply.repostCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {reply.replyCount}
          </span>
        </div>
      </div>

      {reply.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {reply.replies.map((child) => (
            <ReplyItem key={child.uri} reply={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BskyCommentsSection({
  thread,
  fallbackBskyUrl,
}: BskyCommentsProps) {
  const bskyUrl = thread?.webUrl || fallbackBskyUrl;

  return (
    <section
      aria-labelledby="bluesky-discussion-heading"
      className="mt-14 border-t border-border pt-10"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="bluesky-discussion-heading"
            className="font-serif text-xl font-semibold text-foreground"
          >
            Discussion on Bluesky
          </h2>
          {thread ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                {thread.likeCount} {thread.likeCount === 1 ? "like" : "likes"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Repeat2 className="h-4 w-4" />
                {thread.repostCount}{" "}
                {thread.repostCount === 1 ? "repost" : "reposts"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {thread.replyCount}{" "}
                {thread.replyCount === 1 ? "reply" : "replies"}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Join the conversation, bookmark, or reply on Bluesky.
            </p>
          )}
        </div>

        <a
          href={bskyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <span>Reply on Bluesky</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {thread && thread.replies.length > 0 ? (
        <div className="mt-6 space-y-4">
          {thread.replies.map((reply) => (
            <ReplyItem key={reply.uri} reply={reply} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No replies yet. Be the first to reply on{" "}
          <a
            href={bskyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4"
          >
            Bluesky
          </a>
          .
        </div>
      )}
    </section>
  );
}
