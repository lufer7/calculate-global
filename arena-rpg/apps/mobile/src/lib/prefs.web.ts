export const prefs = {
  async get(key: string) {
    try {
      return window.localStorage.getItem(`arena.pref.${key}`);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    try {
      window.localStorage.setItem(`arena.pref.${key}`, value);
    } catch {
      // ignore
    }
  },
  async remove(key: string) {
    try {
      window.localStorage.removeItem(`arena.pref.${key}`);
    } catch {
      // ignore
    }
  },
};
