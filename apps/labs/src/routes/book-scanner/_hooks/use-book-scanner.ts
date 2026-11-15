import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BookMetadata } from "../_types";
import {
  isValidIsbn,
  normalizeIsbn,
  SAMPLE_BOOK_PRESETS,
} from "../_utils/isbn";
import { bookQueryKeys } from "../_utils/query-client";
import { useBarcodeScanner } from "./use-barcode-scanner";
import { useBookQuery } from "./use-book-query";

const STORAGE_KEY = "niwa-labs:book-scanner:history:v1";

function loadHistoryFromStorage(): BookMetadata[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BookMetadata[]) : [];
  } catch {
    return [];
  }
}

function saveHistoryToStorage(items: BookMetadata[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function useBookScanner() {
  const queryClient = useQueryClient();

  const [history, setHistory] = useState<BookMetadata[]>(() =>
    loadHistoryFromStorage()
  );
  const [activeIsbn, setActiveIsbn] = useState<string | null>(() => {
    const existing = loadHistoryFromStorage();
    return existing[0]?.isbn ?? SAMPLE_BOOK_PRESETS[0]?.isbn ?? null;
  });
  const [manualInput, setManualInput] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Seed QueryClient cache from localStorage history on mount so cached books
  // never trigger network calls to Open Library.
  useEffect(() => {
    for (const book of history) {
      queryClient.setQueryData(bookQueryKeys.byIsbn(book.isbn), book);
    }
  }, [history, queryClient]);

  const upsertBookToHistory = useCallback((book: BookMetadata) => {
    setHistory((prev) => {
      const exists = prev.some((item) => item.isbn === book.isbn);
      if (exists) {
        return prev;
      }
      const next = [book, ...prev].slice(0, 50);
      saveHistoryToStorage(next);
      return next;
    });
  }, []);

  const cachedBookForActiveIsbn = useMemo(() => {
    if (!activeIsbn) return undefined;
    return history.find((item) => item.isbn === activeIsbn);
  }, [activeIsbn, history]);

  const bookQuery = useBookQuery({
    isbn: activeIsbn,
    cachedBook: cachedBookForActiveIsbn,
    onBookFetched: upsertBookToHistory,
  });

  const selectIsbn = useCallback((rawIsbn: string) => {
    const clean = normalizeIsbn(rawIsbn);
    if (!isValidIsbn(clean)) {
      setValidationError(
        `"${rawIsbn}" is not a valid ISBN-10 or ISBN-13 (check digit mismatch or missing 978/979 prefix).`
      );
      return;
    }

    setValidationError(null);
    setActiveIsbn(clean);
  }, []);

  const scanner = useBarcodeScanner({
    onIsbnDetected: (detectedIsbn) => {
      setValidationError(null);
      setActiveIsbn(detectedIsbn);
      setManualInput(detectedIsbn);
    },
  });

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualInput.trim()) {
        setValidationError("Enter a 10-digit or 13-digit ISBN to look up.");
        return;
      }
      selectIsbn(manualInput);
    },
    [manualInput, selectIsbn]
  );

  const handleRemoveFromHistory = useCallback((isbnToRemove: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.isbn !== isbnToRemove);
      saveHistoryToStorage(next);
      return next;
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveHistoryToStorage([]);
  }, []);

  return {
    activeIsbn,
    manualInput,
    setManualInput,
    validationError,
    setValidationError,
    history,
    book: bookQuery.data ?? null,
    isLoadingBook: bookQuery.isLoading || bookQuery.isFetching,
    isCachedHit: Boolean(cachedBookForActiveIsbn && !bookQuery.isFetching),
    bookError: bookQuery.error,
    selectIsbn,
    handleManualSubmit,
    handleRemoveFromHistory,
    handleClearHistory,
    scanner,
  };
}
