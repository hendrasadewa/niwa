import { Link } from "react-router";
import { Badge, Button, ColorSchemeToggle } from "@niwa/ui/components";
import type { SqliteDatabaseMeta } from "../../../features/sqlite/types";

interface SqliteHeaderProps {
  status: "initializing" | "ready" | "error";
  meta: SqliteDatabaseMeta | null;
  isExecuting: boolean;
  onRefreshSchema: () => void;
  onResetDatabase: () => void;
}

export function SqliteHeader({
  status,
  meta,
  isExecuting,
  onRefreshSchema,
  onResetDatabase,
}: SqliteHeaderProps) {
  const isDisabled = status !== "ready" || isExecuting;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-xs px-5 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true">←</span>
          <span>Labs</span>
        </Link>
        <h1 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
          SQLite WASM Client
        </h1>
        {meta && (
          <Badge variant="neutral" mono>
            v{meta.version}
          </Badge>
        )}
        {meta && (
          <Badge
            variant={meta.storageMode === "opfs" ? "success" : "warning"}
            dot
            title={
              meta.storageMode === "opfs"
                ? `Persisted in Origin Private File System (${meta.filename})`
                : "Running in transient memory storage (OPFS unavailable)"
            }
          >
            {meta.storageMode === "opfs" ? "OPFS Persistent" : "In-Memory"}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ColorSchemeToggle className="hidden sm:inline-flex" />
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefreshSchema}
          disabled={isDisabled}
        >
          Refresh Schema
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onResetDatabase}
          disabled={isDisabled}
        >
          Reset DB
        </Button>
      </div>
    </header>
  );
}
