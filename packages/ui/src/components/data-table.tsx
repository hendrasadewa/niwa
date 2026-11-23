import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface DataTableProps<TCell = unknown>
  extends HTMLAttributes<HTMLDivElement> {
  columns: string[];
  rows: TCell[][];
  emptyMessage?: string;
  renderCell?: (cell: TCell, rowIndex: number, cellIndex: number) => ReactNode;
  getCellClassName?: (
    cell: TCell,
    rowIndex: number,
    cellIndex: number
  ) => string | undefined;
}

export function DataTable<TCell = unknown>({
  columns,
  rows,
  emptyMessage = "Query returned 0 rows.",
  renderCell,
  getCellClassName,
  className,
  ...props
}: DataTableProps<TCell>) {
  return (
    <div
      className={cn(
        "flex-1 overflow-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    >
      <table className="w-full border-collapse text-left text-xs font-mono">
        <thead className="sticky top-0 border-b border-border bg-surface-muted">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={`${col}-${idx}`}
                className="border-r border-border px-3 py-2.5 font-semibold text-foreground last:border-r-0 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center font-sans text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-surface-muted/60"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      "max-w-xs truncate border-r border-border/60 px-3 py-2 text-foreground last:border-r-0 whitespace-nowrap",
                      getCellClassName?.(cell, rowIndex, cellIndex)
                    )}
                  >
                    {renderCell
                      ? renderCell(cell, rowIndex, cellIndex)
                      : String(cell ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
