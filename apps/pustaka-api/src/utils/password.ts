const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;
const ALGORITHM = "pbkdf2_sha256";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function deriveKeyBytes(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    KEY_BITS
  );

  return new Uint8Array(derivedBits);
}

/**
 * Hashes a plaintext password using the Web Crypto API (PBKDF2-HMAC-SHA256).
 * Format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await deriveKeyBytes(password, salt, PBKDF2_ITERATIONS);
  return `${ALGORITHM}$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

/**
 * Verifies a plaintext password against a stored Web Crypto PBKDF2 hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 4) {
    return false;
  }

  const [alg, iterStr, saltHex, hashHex] = parts;
  if (alg !== ALGORITHM || !iterStr || !saltHex || !hashHex) {
    return false;
  }

  const iterations = Number.parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  try {
    const salt = hexToBytes(saltHex);
    const expectedHash = hexToBytes(hashHex);
    const actualHash = await deriveKeyBytes(password, salt, iterations);
    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
