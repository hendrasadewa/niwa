import type { AuthUser } from "../types/auth";

const UNAMBIGUOUS_ALPHANUM = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a short, human-readable, easy-to-type order slug (e.g., `PO-261118-K7M9`).
 */
export function generateOrderSlug(prefix = "PO"): string {
  const cleanPrefix =
    prefix
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "PO";

  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    const idx = (randomBytes[i] ?? 0) % UNAMBIGUOUS_ALPHANUM.length;
    suffix += UNAMBIGUOUS_ALPHANUM[idx];
  }

  return `${cleanPrefix}-${yy}${mm}${dd}-${suffix}`;
}

/**
 * Normalizes a phone/WhatsApp number to digits (converting `628...` to `08...` for consistent storage).
 */
export function normalizePhoneForStorage(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("628")) {
    return `0${digits.slice(2)}`;
  }
  return digits || phone.trim();
}

export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("08")) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Produces all common Indonesian/international phone number variants (`08...`, `628...`, `+628...`, raw digits)
 * so guest order lookups by phone number match regardless of formatting.
 */
export function getPhoneLookupVariants(input: string): string[] {
  const trimmed = input.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  const variants = new Set<string>([trimmed]);

  if (digits) {
    variants.add(digits);
    if (digits.startsWith("0")) {
      const withoutZero = digits.slice(1);
      variants.add(`62${withoutZero}`);
      variants.add(`+62${withoutZero}`);
    } else if (digits.startsWith("62")) {
      const withoutCountry = digits.slice(2);
      variants.add(`0${withoutCountry}`);
      variants.add(`+${digits}`);
    } else if (digits.startsWith("8")) {
      variants.add(`0${digits}`);
      variants.add(`62${digits}`);
      variants.add(`+62${digits}`);
    }
  }

  return Array.from(variants);
}

/**
 * Checks whether two phone numbers represent the same normalized phone number.
 */
export function isSamePhoneNumber(phoneA: string, phoneB: string): boolean {
  const variantsA = getPhoneLookupVariants(phoneA);
  const normalizedB = normalizePhoneForStorage(phoneB);
  return variantsA.includes(normalizedB) || variantsA.includes(phoneB.trim());
}

/**
 * Masks a customer/guest name for unauthenticated guest views.
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return "C*******";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 1) return "*";
      return `${part[0]}${"*".repeat(Math.min(part.length - 1, 6))}`;
    })
    .join(" ");
}

/**
 * Masks a phone/WhatsApp number for unauthenticated guest views.
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.trim();
  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 2)}****`;
  }
  const prefix = cleaned.slice(0, 4);
  const suffix = cleaned.slice(-3);
  const maskedMiddleLen = Math.max(4, cleaned.length - 7);
  return `${prefix}${"*".repeat(maskedMiddleLen)}${suffix}`;
}

/**
 * Masks a shipping address for unauthenticated guest views.
 */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return "***";
  return address
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (/^(jl\.?|jalan|rt\.?|rw\.?|kel\.?|kec\.?|kota|kab\.?)$/i.test(word)) {
        return word;
      }
      if (/^[0-9]+/.test(word)) {
        return "**";
      }
      if (word.length <= 2) {
        return `${word[0] ?? "*"}*`;
      }
      const trailingPunct = word.match(/[.,;/-]+$/)?.[0] ?? "";
      const coreLen = Math.max(1, word.length - trailingPunct.length - 1);
      return `${word[0]}${"*".repeat(Math.min(coreLen, 6))}${trailingPunct}`;
    })
    .join(" ");
}

/**
 * Determines whether an authenticated user is authorized to view/access an order's unmasked details.
 */
export function canUserAccessOrder(
  user: AuthUser,
  order: {
    customer_id: string | null;
    guest_whatsapp: string | null;
  },
  storeOwnerId?: string | null
): boolean {
  if (user.roles.includes("admin")) {
    return true;
  }
  if (storeOwnerId && storeOwnerId === user.id) {
    return true;
  }
  if (order.customer_id && order.customer_id === user.id) {
    return true;
  }
  if (!order.customer_id && order.guest_whatsapp) {
    const userPhoneVariants = getPhoneLookupVariants(user.whatsapp_number);
    if (userPhoneVariants.includes(order.guest_whatsapp)) {
      return true;
    }
  }
  return false;
}
