import type { SaveGame } from '@arena/core';
import { openSave, sealSave, toHex } from '@arena/core';
import { random } from '../lib/random';

/**
 * Web preview only. Browsers have no Keychain and expo-sqlite on web needs extra
 * server headers, so the save goes to localStorage (still AES-GCM sealed).
 * localStorage may be unavailable (private mode, sandboxed previews) – then we
 * keep everything in memory for the session.
 */
const SAVE_KEY = 'arena.save.slot';
const KEY_NAME = 'arena.localSaveKey.v1';
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
  memory.delete(key);
}

function getLocalKey(): Uint8Array {
  const existing = read(KEY_NAME);
  if (existing && /^[0-9a-f]{64}$/.test(existing)) {
    return new Uint8Array(existing.match(/../g)!.map((h) => parseInt(h, 16)));
  }
  const key = random(32);
  write(KEY_NAME, toHex(key));
  return key;
}

export async function loadSave(slot = 0): Promise<SaveGame | null> {
  const blob = read(`${SAVE_KEY}.${slot}`);
  return blob ? openSave(blob, getLocalKey()) : null;
}

export async function writeSave(save: SaveGame, slot = 0): Promise<void> {
  write(`${SAVE_KEY}.${slot}`, sealSave(save, getLocalKey(), random));
}

export async function deleteAllLocalData(): Promise<void> {
  remove(`${SAVE_KEY}.0`);
  remove(KEY_NAME);
}
