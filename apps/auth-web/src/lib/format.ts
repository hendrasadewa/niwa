import type { z } from "zod";

export function formatUnixDate(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixSeconds * 1000));
}

export function formatRelativeUnix(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  const diffSec = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatUnixDate(unixSeconds);
}

export function summarizeUserAgent(ua: string | null): string {
  if (!ua) return "Unknown browser";

  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
  else if (ua.includes("curl/")) browser = "curl";

  let os = "";
  if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return os ? `${browser} on ${os}` : browser;
}

export function parseMultilineList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractZodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return "***";

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!domain) return "***";
  if (local.includes("***")) return trimmed;

  const visibleCount = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, visibleCount)}***@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.includes("****")) return trimmed;

  if (trimmed.length <= 5) return "****";
  if (trimmed.length <= 7) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-3)}`;
}
