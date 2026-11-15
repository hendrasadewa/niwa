import {
  QueryEditor,
  QueryResults,
  SchemaSidebar,
  SqliteHeader,
} from "./_components";
import { useSqliteDemo } from "./_hooks";
import SqliteDemoMeta from "./meta";

export default function SqliteDemoPage() {
  const {
    status,
    meta,
    schema,
    lastResult,
    error,
    isExecuting,
    sql,
    setSql,
    expandedTables,
    toggleTable,
    handleRunQuery,
    handleKeyDown,
    handleInspectTable,
    handleLoadSampleSql,
    handleClearSql,
    refreshSchema,
    resetDatabase,
  } = useSqliteDemo();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <SqliteDemoMeta />
      <SqliteHeader
        status={status}
        meta={meta}
        isExecuting={isExecuting}
        onRefreshSchema={() => void refreshSchema()}
        onResetDatabase={() => void resetDatabase()}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
        <SchemaSidebar
          status={status}
          schema={schema}
          expandedTables={expandedTables}
          onToggleTable={toggleTable}
          onInspectTable={handleInspectTable}
        />

        <main className="flex flex-col divide-y divide-neutral-800 min-w-0">
          <QueryEditor
            sql={sql}
            status={status}
            isExecuting={isExecuting}
            onChangeSql={setSql}
            onKeyDown={handleKeyDown}
            onRunQuery={handleRunQuery}
            onLoadSampleSql={handleLoadSampleSql}
            onClearSql={handleClearSql}
          />

          <QueryResults lastResult={lastResult} error={error} />
        </main>
      </div>
    </div>
  );
}
