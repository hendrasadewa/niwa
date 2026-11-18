import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUnixDate(
  epochSeconds?: number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!epochSeconds) return "-";
  const date = new Date(epochSeconds * 1000);
  return new Intl.DateTimeFormat(
    "id-ID",
    options ?? {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

export function formatUnixDateTime(epochSeconds?: number | null): string {
  if (!epochSeconds) return "-";
  const date = new Date(epochSeconds * 1000);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toUnixSeconds(dateInput: string | Date): number {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return Math.floor(date.getTime() / 1000);
}

export function unixToDateInputValue(epochSeconds?: number | null): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
