/**
 * Randomness is injected so the core stays platform-agnostic:
 * - mobile passes expo-crypto's getRandomBytes
 * - server/tests pass node:crypto randomBytes
 */
export type RandomBytes = (length: number) => Uint8Array;

/** Deterministic PRNG (mulberry32). Same seed => same battle on client and server. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function randomId(random: RandomBytes, bytes = 16): string {
  return toHex(random(bytes));
}
