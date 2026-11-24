import {
  Alert,
  Badge,
  Card,
  EmptyState,
  Skeleton,
} from "@niwa/ui/components";
import type { BookMetadata } from "../_types";
import { formatIsbnDisplay } from "../_utils/isbn";
import { OpenLibraryError } from "../_utils/open-library";

interface BookDetailCardProps {
  activeIsbn: string | null;
  book: BookMetadata | null;
  isLoading: boolean;
  isCachedHit: boolean;
  error: Error | null;
}

export function BookDetailCard({
  activeIsbn,
  book,
  isLoading,
  isCachedHit,
  error,
}: BookDetailCardProps) {
  return (
    <section className="p-6 flex-1 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            2. Open Library Book Information
          </h2>
          {activeIsbn && (
            <Badge variant="neutral" mono>
              ISBN: {formatIsbnDisplay(activeIsbn)}
            </Badge>
          )}
        </div>

        {book && (
          <Badge variant={isCachedHit ? "success" : "info"} dot>
            {isCachedHit
              ? "Served from Local Cache (0 API calls)"
              : "Fetched from OpenLibrary API"}
          </Badge>
        )}
      </div>

      {isLoading && (
        <Card contentClassName="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6">
          <Skeleton className="w-32 sm:w-full aspect-[2/3] mx-auto rounded-[var(--radius-lg)]" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
            <p className="text-xs text-muted-foreground">
              Querying{" "}
              <code className="font-mono text-foreground">
                openlibrary.org/api/books
              </code>{" "}
              for ISBN {activeIsbn}…
            </p>
          </div>
        </Card>
      )}

      {!isLoading && error && (
        <Alert
          variant={
            error instanceof OpenLibraryError && error.isRateLimited
              ? "warning"
              : "error"
          }
        >
          {error.message}
        </Alert>
      )}

      {!isLoading && !error && !activeIsbn && (
        <EmptyState
          title="No ISBN scanned yet"
          description="Scan a book barcode with your camera or select one of the sample ISBNs above."
        />
      )}

      {!isLoading && !error && activeIsbn && !book && (
        <EmptyState
          title={`No Open Library record found for ISBN ${formatIsbnDisplay(activeIsbn)}`}
          description="The ISBN checksum is valid, but Open Library does not have metadata indexed for this edition yet."
        />
      )}

      {!isLoading && book && (
        <Card contentClassName="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6">
          {/* Book Cover (Resolved via CoverID URL from jscmd=data to avoid ISBN Cover rate limits) */}
          <div className="flex flex-col items-center">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                className="w-32 sm:w-full rounded-[var(--radius-md)] border border-border bg-surface-muted object-cover shadow-[var(--shadow-card)]"
                loading="lazy"
              />
            ) : (
              <div className="w-32 sm:w-full aspect-[2/3] rounded-[var(--radius-md)] border border-dashed border-border-strong/60 bg-surface-muted flex items-center justify-center p-3 text-center">
                <span className="text-[11px] text-muted-foreground">
                  No cover image in Open Library
                </span>
              </div>
            )}
          </div>

          {/* Book Metadata */}
          <div className="space-y-4 min-w-0">
            <div>
              <h3 className="font-serif text-xl font-medium text-foreground leading-snug">
                {book.title}
              </h3>
              {book.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {book.subtitle}
                </p>
              )}
              {book.authors.length > 0 && (
                <p className="text-xs text-primary font-semibold mt-1.5">
                  By {book.authors.map((a) => a.name).join(", ")}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-[var(--radius-xl)] border border-border bg-surface-muted/60 p-3.5 text-xs">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  ISBN-13 / 10
                </dt>
                <dd className="font-mono text-foreground mt-0.5 truncate">
                  {book.isbn}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Published
                </dt>
                <dd className="text-foreground mt-0.5">
                  {book.publishDate ?? "Unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Pages
                </dt>
                <dd className="text-foreground mt-0.5">
                  {book.numberOfPages ? `${book.numberOfPages} pp.` : "—"}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Publishers
                </dt>
                <dd className="text-foreground mt-0.5">
                  {book.publishers.length > 0
                    ? book.publishers.join(", ")
                    : "Unknown Publisher"}
                </dd>
              </div>
            </dl>

            {book.subjects.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Subjects
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {book.subjects.map((subject) => (
                    <Badge key={subject} variant="neutral">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border text-xs">
              <a
                href={book.openLibraryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary-hover font-medium underline underline-offset-4 transition-colors"
              >
                View edition on OpenLibrary.org ↗
              </a>
              {book.identifiers.openlibrary?.[0] && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  OLID: {book.identifiers.openlibrary[0]}
                </span>
              )}
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
