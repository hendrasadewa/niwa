/**
 * Spec-compliant ATProto TID (Timestamp Identifier) generator.
 * 64-bit integer: top bit 0, 53-bit UNIX microsecond timestamp, 10-bit clock ID.
 * Encoded as 13-character base32-sortable string using `234567abcdefghijklmnopqrstuvwxyz`.
 */
const S32_CHAR = "234567abcdefghijklmnopqrstuvwxyz";
const TID_REGEX = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

let lastTimestampUs = 0n;

function encodeS32(value: bigint, length: number): string {
  let remaining = value;
  const chars = new Array<string>(length);
  for (let i = length - 1; i >= 0; i -= 1) {
    const idx = Number(remaining & 31n);
    chars[i] = S32_CHAR[idx] ?? "2";
    remaining >>= 5n;
  }
  return chars.join("");
}

export function generateTid(nowMs = Date.now(), clockId?: number): string {
  let timestampUs = BigInt(nowMs) * 1000n;
  if (timestampUs <= lastTimestampUs) {
    timestampUs = lastTimestampUs + 1n;
  }
  lastTimestampUs = timestampUs;

  const resolvedClockId =
    typeof clockId === "number"
      ? clockId & 0x3ff
      : Math.floor(Math.random() * 1024);

  const combined = (timestampUs << 10n) | BigInt(resolvedClockId);
  return encodeS32(combined, 13);
}

export function isValidTid(value: string): boolean {
  return TID_REGEX.test(value);
}

export function parseAtUri(uri: string): {
  did: string;
  collection: string;
  rkey: string;
} | null {
  if (!uri.startsWith("at://")) return null;
  const parts = uri.slice("at://".length).split("/");
  if (parts.length !== 3) return null;
  const [did, collection, rkey] = parts;
  if (!did || !collection || !rkey) return null;
  return { did, collection, rkey };
}
