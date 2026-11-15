import type { KeyboardEvent } from "react";
import { Button, CodeTextarea } from "@niwa/ui/components";

interface QueryEditorProps {
  sql: string;
  status: "initializing" | "ready" | "error";
  isExecuting: boolean;
  onChangeSql: (sql: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onRunQuery: () => void;
  onLoadSampleSql: () => void;
  onClearSql: () => void;
}

export function QueryEditor({
  sql,
  status,
  isExecuting,
  onChangeSql,
  onKeyDown,
  onRunQuery,
  onLoadSampleSql,
  onClearSql,
}: QueryEditorProps) {
  return (
    <section className="p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            SQL Query Editor
          </span>
          <span className="text-[11px] text-neutral-500">
            (Cmd/Ctrl + Enter to run)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onLoadSampleSql}>
            Sample SQL
          </Button>
          <Button variant="secondary" size="sm" onClick={onClearSql}>
            Clear
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onRunQuery}
            disabled={status !== "ready" || isExecuting || !sql.trim().length}
          >
            {isExecuting ? "Running…" : "Run Query"}
          </Button>
        </div>
      </div>

      <CodeTextarea
        value={sql}
        onChange={(e) => onChangeSql(e.target.value)}
        onKeyDown={onKeyDown}
        rows={8}
        placeholder="SELECT sqlite_version();"
      />
    </section>
  );
}
