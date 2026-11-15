import { useQuery } from "@tanstack/react-query";
import type { BookMetadata } from "../_types";
import { isValidIsbn, normalizeIsbn } from "../_utils/isbn";
import { fetchBookByIsbn } from "../_utils/open-library";
import { bookQueryKeys } from "../_utils/query-client";

interface UseBookQueryOptions {
  isbn: string | null;
  cachedBook?: BookMetadata;
  onBookFetched?: (book: BookMetadata) => void;
}

/**
 * TanStack React Query hook for fetching book details by ISBN from Open Library.
 *
 * Rate-limit safeguards:
 * - Only runs when `isbn` passes ISBN-10 / ISBN-13 checksum validation.
 * - Seeds `initialData` if the ISBN is already present in local scan history,
 *   returning in 0ms with 0 network requests.
 */
export function useBookQuery({
  isbn,
  cachedBook,
  onBookFetched,
}: UseBookQueryOptions) {
  const normalized = isbn ? normalizeIsbn(isbn) : "";
  const isEnabled = Boolean(normalized && isValidIsbn(normalized));

  return useQuery<BookMetadata | null, Error>({
    queryKey: bookQueryKeys.byIsbn(normalized),
    queryFn: async ({ signal }) => {
      const book = await fetchBookByIsbn(normalized, signal);
      if (book) {
        onBookFetched?.(book);
      }
      return book;
    },
    enabled: isEnabled,
    initialData: cachedBook ? cachedBook : undefined,
  });
}
