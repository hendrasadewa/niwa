import { useCallback, useState, type KeyboardEvent } from "react";
import { useSqlite } from "../../../features/sqlite/use-sqlite";

export const DEFAULT_SQL = `-- Create a sample table and query it
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO notes (title, category) VALUES
  ('Explore @sqlite.org/sqlite-wasm with OPFS', 'wasm'),
  ('Build interactive SQLite playground in niwa-labs', 'project');

SELECT * FROM notes ORDER BY id DESC;`;

export function useSqliteDemo() {
  const {
    status,
    meta,
    schema,
    lastResult,
    error,
    isExecuting,
    executeQuery,
    refreshSchema,
    resetDatabase,
  } = useSqlite();

  const [sql, setSql] = useState(DEFAULT_SQL);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>(
    {}
  );

  const toggleTable = useCallback((tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !(prev[tableName] ?? true),
    }));
  }, []);

  const handleRunQuery = useCallback(() => {
    void executeQuery(sql);
  }, [executeQuery, sql]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunQuery();
      }
    },
    [handleRunQuery]
  );

  const handleInspectTable = useCallback(
    (tableName: string) => {
      const escaped = `"${tableName.replace(/"/g, '""')}"`;
      const query = `SELECT * FROM ${escaped} LIMIT 100;`;
      setSql(query);
      void executeQuery(query);
    },
    [executeQuery]
  );

  const handleLoadSampleSql = useCallback(() => {
    setSql(DEFAULT_SQL);
  }, []);

  const handleClearSql = useCallback(() => {
    setSql("");
  }, []);

  return {
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
  };
}
