/**
 * Booking / reference identifiers.
 *
 * Booking numbers are intentionally NOT a simple incrementing counter — they mix
 * a time component with randomness so they can't be guessed or enumerated. In a
 * real backend, generate + persist these server-side and enforce uniqueness.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O/1/I/L)

function randomChars(len: number): string {
  let out = "";
  const cryptoObj =
    typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(len);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  } else {
    for (let i = 0; i < len; i++)
      out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function generateBookingNumber(): string {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  return `RK-${timePart}${randomChars(4)}`;
}

export function generateViewingRef(): string {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  return `VW-${timePart}${randomChars(3)}`;
}

export function generateInquiryRef(): string {
  return `IQ-${randomChars(6)}`;
}
