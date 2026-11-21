/**
 * Masks an email address while preserving enough context for recognition.
 * Example: "hendra.sadewa@gmail.com" -> "he***@gmail.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return "***";

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!domain) return "***";

  if (local.includes("***")) {
    return trimmed;
  }

  const visibleCount = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, visibleCount)}***@${domain}`;
}

/**
 * Masks a phone / WhatsApp number, keeping only the leading prefix and last 3 digits.
 * Example: "08123456789" -> "0812****789"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.includes("****")) return trimmed;

  if (trimmed.length <= 5) {
    return "****";
  }
  if (trimmed.length <= 7) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-3)}`;
}
