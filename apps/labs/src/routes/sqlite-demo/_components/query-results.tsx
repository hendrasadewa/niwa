import { Alert, Badge, DataTable, EmptyState } from "@niwa/ui/components";
import type {
  SqliteCellValue,
  SqliteQueryResult,
} from "../../../features/sqlite/types";

function formatCellValue(value: SqliteCellValue): {
  text: string;
  isNull: boolean;
  isBlob: boolean;
} {
  if (value === null) {
    return { text: "NULL", isNull: true, isBlob: false };
  }
  if (value instanceof Uint8Array) {
    const hex = Array.from(value.slice(0, 16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const suffix = value.byteLength > 16 ? "…" : "";
    return {
      text: `BLOB(${value.byteLength}B) [${hex}${suffix}]`,
      isNull: false,
      isBlob: true,
    };
  }
  return { text: String(value), isNull: false, isBlob: false };
}

interface QueryResultsProps {
  lastResult: SqliteQueryResult | null;
  error: string | null;
}

export function QueryResults({ lastResult, error }: QueryResultsProps) {
  return (
    <section className="flex-1 p-5 flex flex-col gap-3 min-h-[300px] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Results
        </h2>
        {lastResult && !error && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral" mono>
              {lastResult.rows.length} rows
            </Badge>
            {lastResult.changes > 0 && (
              <Badge variant="primary" mono>
                {lastResult.changes} affected
              </Badge>
            )}
            <Badge variant="neutral" mono>
              {lastResult.durationMs} ms
            </Badge>
          </div>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!error && !lastResult && (
        <EmptyState
          title="No query results yet"
          description="Execute a SQL statement above to inspect rows and execution timing."
          className="flex-1 p-8"
        />
      )}

      {!error && lastResult && lastResult.columns.length === 0 && (
        <Alert variant="info" className="p-4">
          Statement executed in{" "}
          <span className="font-mono font-semibold">
            {lastResult.durationMs} ms
          </span>
          . Rows affected:{" "}
          <span className="font-mono font-semibold">
            {lastResult.changes}
          </span>
          .
        </Alert>
      )}

      {!error && lastResult && lastResult.columns.length > 0 && (
        <DataTable
          columns={lastResult.columns}
          rows={lastResult.rows}
          renderCell={(cell) => formatCellValue(cell).text}
          getCellClassName={(cell) => {
            const formatted = formatCellValue(cell);
            if (formatted.isNull) return "italic text-muted-foreground";
            if (formatted.isBlob) return "text-info";
            return undefined;
          }}
        />
      )}
    </section>
  );
}
