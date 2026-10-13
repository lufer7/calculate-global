import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { prefs } from './lib/prefs';

const SERVER_PORT = 8787;

/** Shown on the sign-in screen so testers can confirm they run the latest bundle. */
export const APP_BUILD = 'v0.8.1 (test)';

/** Friend-test APK: the sign-in screen lets testers type the test server address. */
export const TEST_BUILD = process.env.EXPO_PUBLIC_TEST_BUILD === '1';

let manualOverride: string | null = null;

/** Expo / local preview ports talk to the API on :8787; anywhere else the API is the same address as the page. */
const DEV_WEB_PORTS = ['8081', '19006', '8090'];

/** Normalises "192.168.1.20", "192.168.1.20:8787" or "http://…" into a base URL. */
export function normalizeServerUrl(input: string): string | null {
  // No URL() here: React Native's URL implementation lacks setters.
  const m = /^(?:(https?):\/\/)?([a-z0-9.-]+)(?::(\d{1,5}))?\/?$/i.exec(input.trim());
  if (!m) return null;
  const protocol = (m[1] ?? 'http').toLowerCase();
  const port = m[3] ?? (protocol === 'http' ? String(SERVER_PORT) : '');
  return `${protocol}://${m[2]}${port ? `:${port}` : ''}`;
}

export async function loadServerOverride() {
  manualOverride = await prefs.get('serverUrl').catch(() => null);
}

export async function setServerOverride(url: string | null) {
  manualOverride = url;
  if (url) await prefs.set('serverUrl', url);
  else await prefs.remove('serverUrl');
}

/** Host of the computer that serves the Expo bundle, from whatever Expo Go exposes. */
function devHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost,
    (Constants.manifest2 as { extra?: { expoGo?: { debuggerHost?: string } } } | null)?.extra?.expoGo?.debuggerHost,
    Constants.linkingUri?.replace(/^[a-z]+:\/\//i, ''),
  ];
  for (const c of candidates) {
    const host = c?.split('/')[0]?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  return null;
}

/**
 * Where the game server lives, in order of preference:
 * 1. Address typed on the sign-in screen (saved on the device)
 * 2. EXPO_PUBLIC_API_URL, 3. app.json → expo.extra.apiBaseUrl
 * 4. Development: the computer that serves the Expo bundle, port 8787
 */
export function apiBaseUrl(): string {
  if (manualOverride) return manualOverride;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const fromConfig = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (fromConfig) return fromConfig.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return DEV_WEB_PORTS.includes(window.location.port)
      ? `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`
      : window.location.origin;
  }
  return `http://${devHost() ?? 'localhost'}:${SERVER_PORT}`;
}
