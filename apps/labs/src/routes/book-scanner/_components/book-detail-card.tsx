import { Alert, Badge, EmptyState } from "@niwa/ui/components";
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
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
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
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-8 text-center space-y-2 animate-pulse">
          <div className="text-xs font-medium text-neutral-300">
            Querying openlibrary.org/api/books for ISBN {activeIsbn}...
          </div>
          <div className="text-[11px] text-neutral-500">
            Response will be cached in TanStack Query &amp; localStorage.
          </div>
        </div>
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
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6">
          {/* Book Cover (Resolved via CoverID URL from jscmd=data to avoid ISBN Cover rate limits) */}
          <div className="flex flex-col items-center">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                className="w-32 sm:w-full rounded-lg border border-neutral-800 bg-neutral-950 object-cover shadow-md"
                loading="lazy"
              />
            ) : (
              <div className="w-32 sm:w-full aspect-[2/3] rounded-lg border border-dashed border-neutral-800 bg-neutral-950 flex items-center justify-center p-3 text-center">
                <span className="text-[11px] text-neutral-500">
                  No cover image in Open Library
                </span>
              </div>
            )}
          </div>

          {/* Book Metadata */}
          <div className="space-y-4 min-w-0">
            <div>
              <h3 className="text-base font-semibold text-neutral-100 leading-snug">
                {book.title}
              </h3>
              {book.subtitle && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  {book.subtitle}
                </p>
              )}
              {book.authors.length > 0 && (
                <p className="text-xs text-emerald-400 font-medium mt-1.5">
                  By {book.authors.map((a) => a.name).join(", ")}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  ISBN-13 / 10
                </dt>
                <dd className="font-mono text-neutral-200 mt-0.5 truncate">
                  {book.isbn}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Published
                </dt>
                <dd className="text-neutral-200 mt-0.5">
                  {book.publishDate ?? "Unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Pages
                </dt>
                <dd className="text-neutral-200 mt-0.5">
                  {book.numberOfPages ? `${book.numberOfPages} pp.` : "—"}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Publishers
                </dt>
                <dd className="text-neutral-200 mt-0.5">
                  {book.publishers.length > 0
                    ? book.publishers.join(", ")
                    : "Unknown Publisher"}
                </dd>
              </div>
            </dl>

            {book.subjects.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">
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

            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/80 text-xs">
              <a
                href={book.openLibraryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4"
              >
                View edition on OpenLibrary.org ↗
              </a>
              {book.identifiers.openlibrary?.[0] && (
                <span className="font-mono text-[11px] text-neutral-500">
                  OLID: {book.identifiers.openlibrary[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
