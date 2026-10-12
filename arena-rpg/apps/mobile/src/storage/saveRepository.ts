import * as SecureStore from 'expo-secure-store';
import type { SaveGame } from '@arena/core';
import { openSave, sealSave, toHex } from '@arena/core';
import { random } from '../lib/random';
import { closeAndDeleteDb, getDb } from './database';

const KEY_NAME = 'arena.localSaveKey.v1';
const KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  // Stays in this device's Keychain/Keystore; not synced to iCloud Keychain.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Per-install random key. Encryption here is about tamper-resistance and keeping
 * the save unreadable to other apps/backups – the save contains no personal data anyway.
 */
async function getLocalKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTIONS);
  if (existing) return hexToBytes(existing);
  const key = random(32);
  await SecureStore.setItemAsync(KEY_NAME, toHex(key), KEY_OPTIONS);
  return key;
}

export async function loadSave(slot = 0): Promise<SaveGame | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ blob: string }>('SELECT blob FROM save_slots WHERE slot = ?', slot);
  if (!row) return null;
  return openSave(row.blob, await getLocalKey());
}

export async function writeSave(save: SaveGame, slot = 0): Promise<void> {
  const db = await getDb();
  const blob = sealSave(save, await getLocalKey(), random);
  await db.runAsync(
    'INSERT INTO save_slots (slot, blob, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(slot) DO UPDATE SET blob = excluded.blob, updated_at = excluded.updated_at',
    slot,
    blob,
    Date.now(),
  );
}

/** "Delete all my data": wipes the database file and the key. Irreversible by design. */
export async function deleteAllLocalData(): Promise<void> {
  await closeAndDeleteDb();
  await SecureStore.deleteItemAsync(KEY_NAME, KEY_OPTIONS);
}
