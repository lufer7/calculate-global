/** Web preview: no Keychain in browsers, so the token goes to localStorage (with an in-memory fallback). */
const KEY = 'arena.session.v2';
let memory: string | null = null;

export const session = {
  async get() {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return memory;
    }
  },
  async set(token: string) {
    memory = token;
    try {
      window.localStorage.setItem(KEY, token);
    } catch {
      // memory only
    }
  },
  async clear() {
    memory = null;
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
