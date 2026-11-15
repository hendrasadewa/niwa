export type SqliteCellValue = string | number | bigint | boolean | null | Uint8Array;

export interface SqliteColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: boolean;
  defaultValue: string | null;
  pk: boolean;
}

export interface SqliteTableSchema {
  name: string;
  type: "table" | "view";
  sql: string;
  columns: SqliteColumnInfo[];
  rowCount: number;
}

export interface SqliteDatabaseMeta {
  version: string;
  storageMode: "opfs" | "memory";
  filename: string;
}

export interface SqliteQueryResult {
  columns: string[];
  rows: SqliteCellValue[][];
  changes: number;
  durationMs: number;
}

export type WorkerRequest =
  | { id: string; type: "init" }
  | { id: string; type: "exec"; sql: string }
  | { id: string; type: "schema" }
  | { id: string; type: "reset" };

export type WorkerResponse =
  | {
      id: string;
      type: "init";
      ok: true;
      meta: SqliteDatabaseMeta;
      schema: SqliteTableSchema[];
    }
  | {
      id: string;
      type: "exec";
      ok: true;
      result: SqliteQueryResult;
      schema: SqliteTableSchema[];
    }
  | {
      id: string;
      type: "schema";
      ok: true;
      schema: SqliteTableSchema[];
    }
  | {
      id: string;
      type: "reset";
      ok: true;
      schema: SqliteTableSchema[];
    }
  | {
      id: string;
      type: WorkerRequest["type"];
      ok: false;
      error: string;
    };
