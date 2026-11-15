export interface BookMetadata {
  isbn: string;
  title: string;
  subtitle?: string;
  authors: { name: string; url?: string }[];
  publishers: string[];
  publishDate?: string;
  numberOfPages?: number;
  subjects: string[];
  coverUrl?: string;
  coverLargeUrl?: string;
  openLibraryUrl: string;
  identifiers: {
    isbn10?: string[];
    isbn13?: string[];
    openlibrary?: string[];
    oclc?: string[];
    lccn?: string[];
  };
  scannedAt: string;
}

export interface OpenLibraryBookEntry {
  url?: string;
  key?: string;
  title?: string;
  subtitle?: string;
  authors?: { name: string; url?: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  subjects?: { name: string; url?: string }[];
  identifiers?: {
    isbn_10?: string[];
    isbn_13?: string[];
    openlibrary?: string[];
    oclc?: string[];
    lccn?: string[];
  };
  cover?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

export type OpenLibraryBooksResponse = Record<string, OpenLibraryBookEntry>;

export type ScannerCameraStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "unsupported"
  | "permission-denied"
  | "error";

export interface SampleBookPreset {
  label: string;
  isbn: string;
  note: string;
}
