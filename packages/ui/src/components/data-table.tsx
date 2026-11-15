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
        "flex-1 overflow-auto rounded-lg border border-neutral-800 bg-neutral-900/40",
        className
      )}
      {...props}
    >
      <table className="w-full border-collapse text-left text-xs font-mono">
        <thead className="bg-neutral-900 sticky top-0 border-b border-neutral-800">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={`${col}-${idx}`}
                className="px-3 py-2 font-semibold text-neutral-300 border-r border-neutral-800/60 last:border-r-0 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center font-sans text-neutral-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-neutral-800/40 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      "px-3 py-2 border-r border-neutral-800/40 last:border-r-0 whitespace-nowrap max-w-xs truncate text-neutral-200",
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
