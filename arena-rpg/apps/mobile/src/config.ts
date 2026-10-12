import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SERVER_PORT = 8787;

/** Shown on the sign-in screen so testers can confirm they run the latest bundle. */
export const APP_BUILD = 'v0.4 (dokunma düzeltmesi 2)';

/**
 * Where the game server lives.
 * 1. EXPO_PUBLIC_API_URL (e.g. for tunnels or a deployed server)
 * 2. app.json → expo.extra.apiBaseUrl
 * 3. Development: same machine that serves the Expo bundle (Expo Go over Wi-Fi)
 */
export function apiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const fromConfig = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (fromConfig) return fromConfig.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:${SERVER_PORT}`;
}
