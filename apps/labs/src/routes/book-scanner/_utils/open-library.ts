import type {
  BookMetadata,
  OpenLibraryBookEntry,
  OpenLibraryBooksResponse,
} from "../_types";
import { isValidIsbn, normalizeIsbn } from "./isbn";

const OPEN_LIBRARY_BOOKS_API = "https://openlibrary.org/api/books";

export class OpenLibraryError extends Error {
  readonly status?: number;
  readonly isRateLimited: boolean;

  constructor(
    message: string,
    options?: { status?: number; isRateLimited?: boolean }
  ) {
    super(message);
    this.name = "OpenLibraryError";
    this.status = options?.status;
    this.isRateLimited = options?.isRateLimited ?? false;
  }
}

/**
 * Maps an Open Library `jscmd=data` entry to our normalized BookMetadata.
 *
 * Rate-limit compliance note:
 * Open Library's Covers API strictly rate-limits cover requests by ISBN
 * (`/b/isbn/{isbn}-M.jpg` is capped at 100 req / 5 min per IP), whereas
 * cover URLs resolved via CoverID (`/b/id/{coverId}-M.jpg`, provided inside
 * `entry.cover`) are not subject to that ISBN cover lookup throttle.
 */
function mapOpenLibraryEntry(
  isbn: string,
  entry: OpenLibraryBookEntry
): BookMetadata {
  return {
    isbn,
    title: entry.title ?? "Untitled Book",
    subtitle: entry.subtitle,
    authors: entry.authors?.map((a) => ({ name: a.name, url: a.url })) ?? [],
    publishers: entry.publishers?.map((p) => p.name) ?? [],
    publishDate: entry.publish_date,
    numberOfPages: entry.number_of_pages,
    subjects: entry.subjects?.slice(0, 12).map((s) => s.name) ?? [],
    coverUrl: entry.cover?.medium ?? entry.cover?.small,
    coverLargeUrl: entry.cover?.large ?? entry.cover?.medium,
    openLibraryUrl: entry.url ?? `https://openlibrary.org/isbn/${isbn}`,
    identifiers: {
      isbn10: entry.identifiers?.isbn_10,
      isbn13: entry.identifiers?.isbn_13,
      openlibrary: entry.identifiers?.openlibrary,
      oclc: entry.identifiers?.oclc,
      lccn: entry.identifiers?.lccn,
    },
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Fetches book metadata by ISBN (or batch of ISBNs) from Open Library's Books API.
 *
 * Follows Open Library API Usage & Rate Limit Guidelines:
 * - Validates ISBN checksum before sending any network request.
 * - Uses `bibkeys=ISBN:...&format=json&jscmd=data` to retrieve full edition + CoverID
 *   metadata in a single HTTP request.
 * - Detects 429 / 403 rate-limit responses so TanStack Query does not retry and worsen throttling.
 */
export async function fetchBookByIsbn(
  rawIsbn: string,
  signal?: AbortSignal
): Promise<BookMetadata | null> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isValidIsbn(isbn)) {
    throw new OpenLibraryError(`Invalid ISBN checksum: ${rawIsbn}`);
  }

  const bibkey = `ISBN:${isbn}`;
  const url = new URL(OPEN_LIBRARY_BOOKS_API);
  url.searchParams.set("bibkeys", bibkey);
  url.searchParams.set("format", "json");
  url.searchParams.set("jscmd", "data");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (response.status === 429 || response.status === 403) {
    throw new OpenLibraryError(
      "Open Library API rate limit reached (100 req / 5 min per IP). Please wait a few minutes before making new uncached lookups.",
      { status: response.status, isRateLimited: true }
    );
  }

  if (!response.ok) {
    throw new OpenLibraryError(
      `Open Library API responded with HTTP ${response.status}`,
      { status: response.status }
    );
  }

  const data = (await response.json()) as OpenLibraryBooksResponse;
  const entry = data[bibkey];

  if (!entry) {
    return null;
  }

  return mapOpenLibraryEntry(isbn, entry);
}
