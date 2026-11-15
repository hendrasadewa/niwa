import { Badge, Button, EmptyState } from "@niwa/ui/components";
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
    <aside className="p-5 flex flex-col gap-4 bg-neutral-950/60">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Scanned History
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
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
        <ul className="space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
          {history.map((item) => {
            const isActive = item.isbn === activeIsbn;
            return (
              <li
                key={item.isbn}
                className={`group rounded-lg border p-3 transition-colors ${
                  isActive
                    ? "border-emerald-600/70 bg-emerald-950/20"
                    : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectBook(item.isbn)}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="text-xs font-medium text-neutral-100 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {item.authors.map((a) => a.name).join(", ") ||
                        "Unknown Author"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-neutral-500">
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

      <div className="mt-auto rounded-lg border border-neutral-800/80 bg-neutral-900/30 p-3 space-y-1 text-[11px] text-neutral-400">
        <div className="font-semibold text-neutral-300">
          Open Library Rate-Limit Guard
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-neutral-500">
          <li>100 req / 5 min default IP cap</li>
          <li>Checksum verified before network call</li>
          <li>TanStack Query infinite staleTime</li>
          <li>Covers loaded via CoverID (not ISBN)</li>
        </ul>
      </div>
    </aside>
  );
}
