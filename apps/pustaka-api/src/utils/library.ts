const INVITE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function slugifyLibraryName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return base.length >= 2 ? base : "library";
}

export function generateShortSuffix(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += INVITE_ALPHABET[byte % INVITE_ALPHABET.length] ?? "a";
  }
  return out.toLowerCase();
}

export function generateInviteCode(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += INVITE_ALPHABET[byte % INVITE_ALPHABET.length] ?? "A";
  }
  return out;
}
