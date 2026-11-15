import { Link } from "react-router";
import { Badge, Button } from "@niwa/ui/components";
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
    <header className="border-b border-neutral-800 bg-neutral-900/60 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Labs
        </Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-sm font-semibold tracking-tight text-neutral-100">
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

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onRefreshSchema}
          disabled={isDisabled}
        >
          Refresh Schema
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={onResetDatabase}
          disabled={isDisabled}
        >
          Reset DB
        </Button>
      </div>
    </header>
  );
}
