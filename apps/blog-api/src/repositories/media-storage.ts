export interface CachedJsonEntry<T> {
  cachedAt: number;
  data: T;
}

export function createMediaStorageRepo(bucket: R2Bucket) {
  return {
    async putObject(
      key: string,
      data: ArrayBuffer | Uint8Array | string,
      contentType: string
    ): Promise<void> {
      await bucket.put(key, data, {
        httpMetadata: {
          contentType,
        },
      });
    },

    async getObject(key: string): Promise<R2ObjectBody | null> {
      return bucket.get(key);
    },

    async deleteObject(key: string): Promise<void> {
      await bucket.delete(key);
    },

    async readJsonCache<T>(
      cacheKey: string,
      ttlMs: number
    ): Promise<T | null> {
      const obj = await bucket.get(cacheKey);
      if (!obj) return null;
      try {
        const parsed = (await obj.json()) as CachedJsonEntry<T>;
        if (
          !parsed ||
          typeof parsed.cachedAt !== "number" ||
          Date.now() - parsed.cachedAt > ttlMs
        ) {
          return null;
        }
        return parsed.data;
      } catch {
        return null;
      }
    },

    async writeJsonCache<T>(cacheKey: string, data: T): Promise<void> {
      const payload: CachedJsonEntry<T> = {
        cachedAt: Date.now(),
        data,
      };
      await bucket.put(cacheKey, JSON.stringify(payload), {
        httpMetadata: {
          contentType: "application/json",
        },
      });
    },

    async deleteJsonCache(cacheKey: string): Promise<void> {
      await bucket.delete(cacheKey);
    },
  };
}

export type MediaStorageRepo = ReturnType<typeof createMediaStorageRepo>;
