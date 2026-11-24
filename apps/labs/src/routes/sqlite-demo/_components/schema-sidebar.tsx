import { Badge, Button, EmptyState, Skeleton } from "@niwa/ui/components";
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
    <aside className="bg-surface-muted/35 p-4 flex flex-col gap-3 overflow-y-auto lg:max-h-[calc(100vh-61px)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Schema Explorer
        </h2>
        <Badge variant="neutral" mono>
          {schema.length} {schema.length === 1 ? "object" : "objects"}
        </Badge>
      </div>

      {status === "initializing" && (
        <div className="space-y-2 py-2" aria-label="Initializing SQLite WASM worker">
          <Skeleton className="h-9 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
          <p className="text-xs text-muted-foreground pt-1">
            Initializing SQLite WASM worker…
          </p>
        </div>
      )}

      {status === "ready" && schema.length === 0 && (
        <EmptyState
          title="No tables found"
          description={
            <>
              Run a <code className="font-mono text-foreground">CREATE TABLE</code>{" "}
              query in the editor to get started.
            </>
          }
          className="p-5"
        />
      )}

      <ul className="space-y-2">
        {schema.map((table) => {
          const isExpanded = expandedTables[table.name] ?? true;
          return (
            <li
              key={table.name}
              className="rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-card)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 hover:bg-surface-muted/60 transition-colors">
                <button
                  type="button"
                  onClick={() => onToggleTable(table.name)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-2 text-left text-xs font-medium text-foreground truncate flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                  <span className="truncate font-mono">{table.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({table.rowCount})
                  </span>
                </button>
                <Button
                  variant="soft"
                  size="xs"
                  onClick={() => onInspectTable(table.name)}
                  title={`Query ${table.name}`}
                >
                  SELECT
                </Button>
              </div>

              {isExpanded && table.columns.length > 0 && (
                <ul className="border-t border-border bg-surface-muted/40 px-3 py-2 space-y-1.5">
                  {table.columns.map((col) => (
                    <li
                      key={col.cid}
                      className="flex items-center justify-between gap-2 text-[11px] font-mono"
                    >
                      <span className="flex items-center gap-1.5 text-foreground truncate">
                        {col.pk && (
                          <Badge
                            variant="warning"
                            className="px-1.5 py-0 text-[9px]"
                            title="Primary Key"
                          >
                            PK
                          </Badge>
                        )}
                        <span className="truncate">{col.name}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0">
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
