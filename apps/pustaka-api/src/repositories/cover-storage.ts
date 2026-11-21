export function createCoverStorageRepo(bucket: R2Bucket) {
  return {
    async put(
      key: string,
      data: ArrayBuffer,
      contentType: string
    ): Promise<void> {
      await bucket.put(key, data, {
        httpMetadata: { contentType },
      });
    },

    async get(key: string): Promise<R2ObjectBody | null> {
      return bucket.get(key);
    },

    async delete(key: string): Promise<void> {
      await bucket.delete(key);
    },
  };
}

export type CoverStorageRepo = ReturnType<typeof createCoverStorageRepo>;
