const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out;
}

/** Tolerant of human typing: lowercase, dashes/spaces, O→0, I/L→1. */
export function base32Decode(text: string): Uint8Array | null {
  const clean = text.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = CROCKFORD.indexOf(ch);
    if (idx < 0) return null;
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >>> 18) & 63]! + B64[(n >>> 12) & 63]!;
    if (i + 1 < bytes.length) out += B64[(n >>> 6) & 63]!;
    if (i + 2 < bytes.length) out += B64[n & 63]!;
  }
  return out;
}

export function base64UrlDecode(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const out: number[] = [];
  let value = 0;
  let bits = 0;
  for (const ch of text) {
    value = ((value << 6) | B64.indexOf(ch)) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Hand-rolled UTF-8 so the core does not depend on TextEncoder/TextDecoder availability in the JS engine. */
export const utf8 = {
  encode(s: string): Uint8Array {
    const out: number[] = [];
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
      else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
    return new Uint8Array(out);
  },
  decode(b: Uint8Array): string {
    let out = '';
    for (let i = 0; i < b.length; ) {
      const c = b[i]!;
      const cont = (n: number) => b[i + n]! & 63;
      let cp: number;
      if (c < 0x80) (cp = c), (i += 1);
      else if (c < 0xe0) (cp = ((c & 31) << 6) | cont(1)), (i += 2);
      else if (c < 0xf0) (cp = ((c & 15) << 12) | (cont(1) << 6) | cont(2)), (i += 3);
      else (cp = ((c & 7) << 18) | (cont(1) << 12) | (cont(2) << 6) | cont(3)), (i += 4);
      out += String.fromCodePoint(cp);
    }
    return out;
  },
};
