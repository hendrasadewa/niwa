import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
  type SqlValue,
} from "@sqlite.org/sqlite-wasm";
import type {
  SqliteCellValue,
  SqliteColumnInfo,
  SqliteDatabaseMeta,
  SqliteQueryResult,
  SqliteTableSchema,
  WorkerRequest,
  WorkerResponse,
} from "./types";

const DB_FILENAME = "/niwa-labs.sqlite3";

let sqlite3Instance: Sqlite3Static | null = null;
let dbInstance: Database | null = null;
let dbMeta: SqliteDatabaseMeta | null = null;

function openDatabase(sqlite3: Sqlite3Static): {
  db: Database;
  meta: SqliteDatabaseMeta;
} {
  const hasOpfs = "opfs" in sqlite3 && Boolean(sqlite3.oo1.OpfsDb);
  const db = hasOpfs
    ? new sqlite3.oo1.OpfsDb(DB_FILENAME)
    : new sqlite3.oo1.DB(DB_FILENAME, "ct");

  return {
    db,
    meta: {
      version: sqlite3.version.libVersion,
      storageMode: hasOpfs ? "opfs" : "memory",
      filename: db.filename,
    },
  };
}

async function ensureInitialized(): Promise<{
  sqlite3: Sqlite3Static;
  db: Database;
  meta: SqliteDatabaseMeta;
}> {
  if (!sqlite3Instance) {
    sqlite3Instance = await sqlite3InitModule();
  }
  if (!dbInstance || !dbMeta) {
    const opened = openDatabase(sqlite3Instance);
    dbInstance = opened.db;
    dbMeta = opened.meta;
  }
  return { sqlite3: sqlite3Instance, db: dbInstance, meta: dbMeta };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizeValue(val: SqlValue): SqliteCellValue {
  if (val instanceof Int8Array) {
    return new Uint8Array(val.buffer, val.byteOffset, val.byteLength);
  }
  if (val instanceof ArrayBuffer) {
    return new Uint8Array(val);
  }
  return val;
}

function readSchema(db: Database): SqliteTableSchema[] {
  const objects = db.selectObjects(
    `SELECT name, type, sql
     FROM sqlite_schema
     WHERE type IN ('table', 'view')
       AND name NOT LIKE 'sqlite_%'
     ORDER BY type DESC, name ASC;`
  );

  return objects.map((obj) => {
    const name = String(obj.name ?? "");
    const type = obj.type === "view" ? "view" : "table";
    const sql = String(obj.sql ?? "");
    const quotedName = quoteIdentifier(name);

    const pragmaRows = db.selectObjects(`PRAGMA table_info(${quotedName});`);
    const columns: SqliteColumnInfo[] = pragmaRows.map((col) => ({
      cid: Number(col.cid ?? 0),
      name: String(col.name ?? ""),
      type: String(col.type || "ANY"),
      notnull: Boolean(col.notnull),
      defaultValue:
        col.dflt_value === null || col.dflt_value === undefined
          ? null
          : String(col.dflt_value),
      pk: Number(col.pk ?? 0) > 0,
    }));

    let rowCount: number;
    try {
      const countVal = db.selectValue(
        `SELECT COUNT(*) FROM ${quotedName};`
      );
      rowCount = Number(countVal ?? 0);
    } catch {
      rowCount = 0;
    }

    return {
      name,
      type,
      sql,
      columns,
      rowCount,
    };
  });
}

function executeSql(db: Database, sql: string): SqliteQueryResult {
  const start = performance.now();
  const columnNames: string[] = [];
  const rawRows: SqlValue[][] = [];

  db.exec({
    sql,
    columnNames,
    resultRows: rawRows,
    rowMode: "array",
  });

  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  const changes = Number(db.changes(false));
  const rows: SqliteCellValue[][] = rawRows.map((row) =>
    row.map(normalizeValue)
  );

  return {
    columns: columnNames,
    rows,
    changes,
    durationMs,
  };
}

function resetUserTables(db: Database): void {
  const objects = db.selectObjects(
    `SELECT name, type
     FROM sqlite_schema
     WHERE type IN ('table', 'view')
       AND name NOT LIKE 'sqlite_%';`
  );

  db.exec("PRAGMA foreign_keys = OFF;");
  try {
    db.transaction((txDb) => {
      for (const obj of objects) {
        const name = String(obj.name ?? "");
        const kind = obj.type === "view" ? "VIEW" : "TABLE";
        txDb.exec(`DROP ${kind} IF EXISTS ${quoteIdentifier(name)};`);
      }
    });
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

let queue = Promise.resolve();

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  queue = queue.then(async () => {
    try {
      const { db, meta } = await ensureInitialized();

      switch (request.type) {
        case "init": {
          const schema = readSchema(db);
          const response: WorkerResponse = {
            id: request.id,
            type: "init",
            ok: true,
            meta,
            schema,
          };
          self.postMessage(response);
          break;
        }
        case "exec": {
          const result = executeSql(db, request.sql);
          const schema = readSchema(db);
          const response: WorkerResponse = {
            id: request.id,
            type: "exec",
            ok: true,
            result,
            schema,
          };
          self.postMessage(response);
          break;
        }
        case "schema": {
          const schema = readSchema(db);
          const response: WorkerResponse = {
            id: request.id,
            type: "schema",
            ok: true,
            schema,
          };
          self.postMessage(response);
          break;
        }
        case "reset": {
          resetUserTables(db);
          const schema = readSchema(db);
          const response: WorkerResponse = {
            id: request.id,
            type: "reset",
            ok: true,
            schema,
          };
          self.postMessage(response);
          break;
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown SQLite worker error";
      const response: WorkerResponse = {
        id: request.id,
        type: request.type,
        ok: false,
        error: message,
      };
      self.postMessage(response);
    }
  });
});
