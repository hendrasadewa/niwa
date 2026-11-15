import type { SampleBookPreset } from "../_types";

/**
 * Strips hyphens, spaces, and non-ISBN characters, uppercasing any trailing 'x'.
 */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9xX]/g, "").toUpperCase();
}

/**
 * Validates an ISBN-10 string using the Modulo 11 checksum.
 */
export function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(isbn[i]) * (10 - i);
  }

  const lastChar = isbn[9];
  sum += lastChar === "X" ? 10 : Number(lastChar);

  return sum % 11 === 0;
}

/**
 * Validates a Bookland EAN-13 / ISBN-13 string (must start with 978 or 979)
 * using the standard Modulo 10 checksum.
 */
export function isValidIsbn13(isbn: string): boolean {
  if (!/^(978|979)\d{10}$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(isbn[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(isbn[12]);
}

/**
 * Checks whether a normalized or raw string is a valid ISBN-10 or ISBN-13.
 * Used as a client-side guard so non-book barcodes or partial inputs never
 * trigger Open Library API calls.
 */
export function isValidIsbn(raw: string): boolean {
  const clean = normalizeIsbn(raw);
  if (clean.length === 10) {
    return isValidIsbn10(clean);
  }
  if (clean.length === 13) {
    return isValidIsbn13(clean);
  }
  return false;
}

/**
 * Formats an ISBN-13 or ISBN-10 for readable display.
 */
export function formatIsbnDisplay(isbn: string): string {
  const clean = normalizeIsbn(isbn);
  if (clean.length === 13) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}-${clean.slice(4, 9)}-${clean.slice(9, 12)}-${clean.slice(12)}`;
  }
  return clean;
}

export const SAMPLE_BOOK_PRESETS: SampleBookPreset[] = [
  {
    label: "Designing Data-Intensive Applications",
    isbn: "9781449373320",
    note: "Martin Kleppmann",
  },
  {
    label: "The Pragmatic Programmer",
    isbn: "9780135957059",
    note: "David Thomas & Andrew Hunt",
  },
  {
    label: "Structure and Interpretation of Computer Programs",
    isbn: "9780262510875",
    note: "Abelson & Sussman",
  },
  {
    label: "Clean Code",
    isbn: "9780132350884",
    note: "Robert C. Martin",
  },
];
