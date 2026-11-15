import { QueryClient } from "@tanstack/react-query";
import { OpenLibraryError } from "./open-library";

/**
 * Dedicated QueryClient configured for Open Library API rate-limit compliance:
 * - `staleTime: Infinity`: ISBN book metadata is immutable edition data; never refetch
 *   an already-resolved ISBN during the session.
 * - `gcTime: 24h`: Keep fetched books in memory cache for 24 hours.
 * - `retry`: Never retry on 429/403 rate-limit or 4xx client errors; allow at most 1 retry
 *   with backoff on transient network failures.
 */
export const bookScannerQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error instanceof OpenLibraryError) {
          if (
            error.isRateLimited ||
            (error.status && error.status >= 400 && error.status < 500)
          ) {
            return false;
          }
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    },
  },
});

export const bookQueryKeys = {
  all: ["openlibrary", "books"] as const,
  byIsbn: (isbn: string) => ["openlibrary", "books", isbn] as const,
};
