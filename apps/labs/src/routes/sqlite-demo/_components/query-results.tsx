import { Alert, DataTable, EmptyState } from "@niwa/ui/components";
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
    <section className="flex-1 p-4 flex flex-col gap-3 min-h-[300px] overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Results
        </h2>
        {lastResult && !error && (
          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span>{lastResult.rows.length} rows</span>
            {lastResult.changes > 0 && (
              <span>{lastResult.changes} affected</span>
            )}
            <span>{lastResult.durationMs} ms</span>
          </div>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!error && !lastResult && (
        <EmptyState
          title="Execute a SQL statement above to inspect results."
          className="flex-1 p-8"
        />
      )}

      {!error && lastResult && lastResult.columns.length === 0 && (
        <Alert variant="info" className="p-4">
          Statement executed in{" "}
          <span className="font-mono text-neutral-100">
            {lastResult.durationMs} ms
          </span>
          . Rows affected:{" "}
          <span className="font-mono text-neutral-100">
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
            if (formatted.isNull) return "italic text-neutral-500";
            if (formatted.isBlob) return "text-sky-300";
            return undefined;
          }}
        />
      )}
    </section>
  );
}
