import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SqliteDatabaseMeta,
  SqliteQueryResult,
  SqliteTableSchema,
  WorkerRequest,
  WorkerResponse,
} from "./types";

type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

type PendingRequest = {
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
};

export function useSqlite() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());

  const [status, setStatus] = useState<"initializing" | "ready" | "error">(
    "initializing"
  );
  const [meta, setMeta] = useState<SqliteDatabaseMeta | null>(null);
  const [schema, setSchema] = useState<SqliteTableSchema[]>([]);
  const [lastResult, setLastResult] = useState<SqliteQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const sendRequest = useCallback(
    (payload: DistributiveOmit<WorkerRequest, "id">): Promise<WorkerResponse> => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error("SQLite worker is not initialized"));
          return;
        }
        const id = crypto.randomUUID();
        pendingRef.current.set(id, { resolve, reject });
        worker.postMessage({ ...payload, id } as WorkerRequest);
      });
    },
    []
  );

  useEffect(() => {
    const worker = new Worker(
      new URL("./sqlite.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    const pendingMap = pendingRef.current;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = pendingMap.get(response.id);
      if (!pending) return;
      pendingMap.delete(response.id);

      if (!response.ok) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response);
      }
    };

    worker.onerror = (err) => {
      setStatus("error");
      setError(err.message || "Worker encountered an unexpected error");
    };

    let cancelled = false;
    const initId = crypto.randomUUID();
    pendingMap.set(initId, {
      resolve: (res) => {
        if (cancelled || !res.ok || res.type !== "init") return;
        setMeta(res.meta);
        setSchema(res.schema);
        setStatus("ready");
      },
      reject: (err) => {
        if (cancelled) return;
        setStatus("error");
        setError(err.message);
      },
    });
    worker.postMessage({ id: initId, type: "init" } satisfies WorkerRequest);

    return () => {
      cancelled = true;
      worker.terminate();
      workerRef.current = null;
      pendingMap.clear();
    };
  }, []);

  const executeQuery = useCallback(
    async (sql: string): Promise<SqliteQueryResult | null> => {
      if (!sql.trim()) return null;
      setIsExecuting(true);
      setError(null);
      try {
        const res = await sendRequest({ type: "exec", sql });
        if (res.ok && res.type === "exec") {
          setLastResult(res.result);
          setSchema(res.schema);
          return res.result;
        }
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [sendRequest]
  );

  const refreshSchema = useCallback(async () => {
    try {
      const res = await sendRequest({ type: "schema" });
      if (res.ok && res.type === "schema") {
        setSchema(res.schema);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [sendRequest]);

  const resetDatabase = useCallback(async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const res = await sendRequest({ type: "reset" });
      if (res.ok && res.type === "reset") {
        setSchema(res.schema);
        setLastResult(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsExecuting(false);
    }
  }, [sendRequest]);

  return {
    status,
    meta,
    schema,
    lastResult,
    error,
    isExecuting,
    executeQuery,
    refreshSchema,
    resetDatabase,
  };
}
