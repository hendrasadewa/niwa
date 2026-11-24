import { Badge, Button, Card, EmptyState } from "@niwa/ui/components";
import type { BookMetadata } from "../_types";

interface ScanHistoryListProps {
  history: BookMetadata[];
  activeIsbn: string | null;
  onSelectBook: (isbn: string) => void;
  onRemoveBook: (isbn: string) => void;
}

export function ScanHistoryList({
  history,
  activeIsbn,
  onSelectBook,
  onRemoveBook,
}: ScanHistoryListProps) {
  return (
    <aside className="p-5 flex flex-col gap-4 bg-surface-muted/35">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Scanned History
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Cached locally ({history.length})
          </p>
        </div>
        <Badge variant="neutral" mono>
          0 API Hits
        </Badge>
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="No books in history"
          description="Books you scan or look up are cached here so re-opening them never consumes Open Library rate limits."
        />
      ) : (
        <ul className="space-y-2 overflow-y-auto lg:max-h-[calc(100vh-220px)] pr-1">
          {history.map((item) => {
            const isActive = item.isbn === activeIsbn;
            return (
              <li
                key={item.isbn}
                className={`group rounded-[var(--radius-xl)] border p-3 transition-colors shadow-[var(--shadow-card)] ${
                  isActive
                    ? "border-primary bg-primary-soft/60"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectBook(item.isbn)}
                    className="flex-1 text-left min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded"
                  >
                    <div className="font-serif text-sm font-medium text-foreground truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.authors.map((a) => a.name).join(", ") ||
                        "Unknown Author"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {item.isbn}
                      </span>
                    </div>
                  </button>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onRemoveBook(item.isbn)}
                    title="Remove from history"
                    aria-label={`Remove ${item.title}`}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Card
        className="mt-auto"
        contentClassName="p-4 space-y-1.5 text-[11px] text-muted-foreground"
      >
        <div className="font-semibold text-foreground">
          Open Library Rate-Limit Guard
        </div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>100 req / 5 min default IP cap</li>
          <li>Checksum verified before network call</li>
          <li>TanStack Query infinite staleTime</li>
          <li>Covers loaded via CoverID (not ISBN)</li>
        </ul>
      </Card>
    </aside>
  );
}
