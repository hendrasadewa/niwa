import type { KeyboardEvent } from "react";
import { Button, CodeTextarea, Spinner } from "@niwa/ui/components";

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
    <section className="p-5 flex flex-col gap-3 bg-surface/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            SQL Query Editor
          </h2>
          <span className="text-[11px] text-muted-foreground/80">
            (Cmd/Ctrl + Enter to run)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onLoadSampleSql}>
            Sample SQL
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSql}>
            Clear
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onRunQuery}
            disabled={status !== "ready" || isExecuting || !sql.trim().length}
          >
            {isExecuting && <Spinner size="sm" />}
            {isExecuting ? "Running…" : "Run Query"}
          </Button>
        </div>
      </div>

      <CodeTextarea
        value={sql}
        onChange={(e) => onChangeSql(e.target.value)}
        onKeyDown={onKeyDown}
        rows={8}
        aria-label="SQL query editor"
        placeholder="SELECT sqlite_version();"
      />
    </section>
  );
}
