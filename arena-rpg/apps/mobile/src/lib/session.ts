import * as SecureStore from 'expo-secure-store';

/** The session token is the only thing the app stores; it lives in the Keychain/Keystore. */
const KEY = 'arena.session.v2';
const OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const session = {
  get: () => SecureStore.getItemAsync(KEY, OPTS),
  set: (token: string) => SecureStore.setItemAsync(KEY, token, OPTS),
  clear: () => SecureStore.deleteItemAsync(KEY, OPTS),
};
