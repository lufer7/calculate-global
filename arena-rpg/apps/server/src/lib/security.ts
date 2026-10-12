import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Memory-hard password hash (scrypt, built into Node – no native add-on to compile). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return timingSafeEqual(actual, expected);
}

/** Used when an email is unknown, so login timing does not reveal which emails exist. */
export const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const randomId = () => randomBytes(16).toString('hex');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function sixDigitCode(): string {
  return (randomBytes(4).readUInt32BE(0) % 1_000_000).toString().padStart(6, '0');
}

// ---- TOTP (RFC 6238, SHA-1, 30 s, 6 digits) – works with any authenticator app ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(bytes: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function fromBase32(s: string): Buffer {
  const clean = s.replace(/=+$/, '').toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('bad base32');
    value = ((value << 5) | i) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32(randomBytes(20));

export function totpAt(secret: string, step: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', fromBase32(secret)).update(msg).digest();
  const off = h[h.length - 1]! & 15;
  const bin = ((h[off]! & 0x7f) << 24) | (h[off + 1]! << 16) | (h[off + 2]! << 8) | h[off + 3]!;
  return (bin % 1_000_000).toString().padStart(6, '0');
}

/** Returns the matched time step (for replay protection) or null. Accepts ±1 step of clock drift. */
export function verifyTotp(secret: string, code: string, now: number, lastUsedStep: number): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 30_000);
  for (const step of [current, current - 1, current + 1]) {
    if (step > lastUsedStep && safeEqual(totpAt(secret, step), code)) return step;
  }
  return null;
}

export function otpauthUri(email: string, secret: string, issuer = 'Aegis Admin'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&period=30&digits=6`;
}

/** "kaan@example.com" -> "k***@e******.com" */
export function maskEmail(email: string): string {
  const [user, domain = ''] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${user!.slice(0, 1)}***@${name.slice(0, 1)}${'*'.repeat(Math.max(1, name.length - 1))}${tld}`;
}
