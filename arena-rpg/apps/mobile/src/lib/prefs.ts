import * as SecureStore from 'expo-secure-store';

/** Small device-local settings (not personal data), e.g. a manually entered server address. */
export const prefs = {
  get: (key: string) => SecureStore.getItemAsync(`arena.pref.${key}`),
  set: (key: string, value: string) => SecureStore.setItemAsync(`arena.pref.${key}`, value),
  remove: (key: string) => SecureStore.deleteItemAsync(`arena.pref.${key}`),
};
