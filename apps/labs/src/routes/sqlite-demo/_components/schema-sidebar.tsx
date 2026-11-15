import { Button, EmptyState } from "@niwa/ui/components";
import type { SqliteTableSchema } from "../../../features/sqlite/types";

interface SchemaSidebarProps {
  status: "initializing" | "ready" | "error";
  schema: SqliteTableSchema[];
  expandedTables: Record<string, boolean>;
  onToggleTable: (tableName: string) => void;
  onInspectTable: (tableName: string) => void;
}

export function SchemaSidebar({
  status,
  schema,
  expandedTables,
  onToggleTable,
  onInspectTable,
}: SchemaSidebarProps) {
  return (
    <aside className="bg-neutral-900/30 p-4 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-57px)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Schema Explorer
        </h2>
        <span className="text-xs font-mono text-neutral-500">
          {schema.length} {schema.length === 1 ? "object" : "objects"}
        </span>
      </div>

      {status === "initializing" && (
        <p className="text-xs text-neutral-500 py-4">
          Initializing SQLite WASM worker…
        </p>
      )}

      {status === "ready" && schema.length === 0 && (
        <EmptyState
          title="No tables found."
          description={
            <>
              Run a <code className="text-neutral-300">CREATE TABLE</code> query
              in the editor to get started.
            </>
          }
          className="p-4"
        />
      )}

      <ul className="space-y-1.5">
        {schema.map((table) => {
          const isExpanded = expandedTables[table.name] ?? true;
          return (
            <li
              key={table.name}
              className="rounded-md border border-neutral-800/80 bg-neutral-900/60 overflow-hidden"
            >
              <div className="flex items-center justify-between px-2.5 py-2 hover:bg-neutral-800/50 transition-colors">
                <button
                  type="button"
                  onClick={() => onToggleTable(table.name)}
                  className="flex items-center gap-2 text-left text-xs font-medium text-neutral-200 truncate flex-1 cursor-pointer"
                >
                  <span className="text-[10px] text-neutral-500">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                  <span className="truncate font-mono">{table.name}</span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    ({table.rowCount})
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onInspectTable(table.name)}
                  title={`Query ${table.name}`}
                >
                  SELECT
                </Button>
              </div>

              {isExpanded && table.columns.length > 0 && (
                <ul className="border-t border-neutral-800/60 bg-neutral-950/50 px-3 py-1.5 space-y-1">
                  {table.columns.map((col) => (
                    <li
                      key={col.cid}
                      className="flex items-center justify-between gap-2 text-[11px] font-mono"
                    >
                      <span className="flex items-center gap-1.5 text-neutral-300 truncate">
                        {col.pk && (
                          <span
                            className="text-[9px] font-sans font-semibold px-1 rounded bg-amber-500/20 text-amber-300"
                            title="Primary Key"
                          >
                            PK
                          </span>
                        )}
                        <span className="truncate">{col.name}</span>
                      </span>
                      <span className="text-neutral-500 shrink-0">
                        {col.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
