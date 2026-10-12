import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base32Decode, base32Encode, base64UrlDecode, base64UrlEncode, utf8 } from './encoding';
import type { RandomBytes } from './random';
import { toHex } from './random';
import type { SaveGame } from './save';
import { parseSave, serializeSave } from './save';

/**
 * Zero-knowledge transfer
 * -----------------------
 * The transfer code is 128 random bits (+1 checksum byte), shown as
 * 7 groups of 4 Crockford-base32 chars, e.g. "7KQ2-M9XD-...".
 * From it we derive two independent keys with HKDF:
 *   - lookupId: where the encrypted blob is parked on the relay (server sees only this)
 *   - encKey:   AES-256-GCM key (never leaves the device)
 * The server cannot decrypt, cannot link the blob to a person, and deletes it after TTL / first read.
 */

const SECRET_BYTES = 16;
const HKDF_SALT = utf8.encode('arena-rpg/transfer/v1');
const AAD = utf8.encode('arena-rpg/save/v1');
const BLOB_PREFIX = 'AR1.';

export interface TransferKeys {
  lookupId: string;
  encKey: Uint8Array;
}

export function generateTransferCode(random: RandomBytes): string {
  const secret = random(SECRET_BYTES);
  const withChecksum = new Uint8Array(SECRET_BYTES + 1);
  withChecksum.set(secret);
  withChecksum[SECRET_BYTES] = sha256(secret)[0]!;
  return base32Encode(withChecksum).match(/.{1,4}/g)!.join('-');
}

/** Returns null for typos (bad chars, wrong length, checksum mismatch). */
export function parseTransferCode(code: string): Uint8Array | null {
  const bytes = base32Decode(code);
  if (!bytes || bytes.length !== SECRET_BYTES + 1) return null;
  const secret = bytes.slice(0, SECRET_BYTES);
  return sha256(secret)[0] === bytes[SECRET_BYTES] ? secret : null;
}

export function deriveTransferKeys(secret: Uint8Array): TransferKeys {
  return {
    lookupId: toHex(hkdf(sha256, secret, HKDF_SALT, utf8.encode('lookup'), 16)),
    encKey: hkdf(sha256, secret, HKDF_SALT, utf8.encode('enc'), 32),
  };
}

export function sealSave(save: SaveGame, encKey: Uint8Array, random: RandomBytes): string {
  const nonce = random(12);
  const ciphertext = gcm(encKey, nonce, AAD).encrypt(utf8.encode(serializeSave(save)));
  const packed = new Uint8Array(nonce.length + ciphertext.length);
  packed.set(nonce);
  packed.set(ciphertext, nonce.length);
  return BLOB_PREFIX + base64UrlEncode(packed);
}

export class TransferError extends Error {}

export function openSave(blob: string, encKey: Uint8Array): SaveGame {
  if (!blob.startsWith(BLOB_PREFIX)) throw new TransferError('bad_blob');
  const packed = base64UrlDecode(blob.slice(BLOB_PREFIX.length));
  if (!packed || packed.length < 12 + 16) throw new TransferError('bad_blob');
  let plain: Uint8Array;
  try {
    plain = gcm(encKey, packed.slice(0, 12), AAD).decrypt(packed.slice(12));
  } catch {
    throw new TransferError('wrong_code_or_corrupted');
  }
  return parseSave(utf8.decode(plain));
}

/** One call for the "Export" button: new code + encrypted blob + relay id. */
export function createExportPackage(save: SaveGame, random: RandomBytes) {
  const code = generateTransferCode(random);
  const keys = deriveTransferKeys(parseTransferCode(code)!);
  return { code, lookupId: keys.lookupId, blob: sealSave(save, keys.encKey, random) };
}
