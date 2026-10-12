import type { PvpSnapshot } from '@arena/core';
import { API_BASE_URL } from '../config/privacy';

/**
 * The only network client in the app. Requests carry no cookies, no auth headers,
 * no device info – just the minimum body each endpoint needs.
 */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: { 'content-type': 'application/json' },
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  fight: (token: string, snapshot: PvpSnapshot) =>
    call<{ seed: number; result: 'a' | 'b' | 'draw'; me: { displayName: string; rating: number; delta: number } }>(
      '/v1/pvp/fight',
      { method: 'POST', body: JSON.stringify({ token, snapshot }) },
    ),
  ladder: () => call<{ entries: { displayName: string; rating: number; wins: number; losses: number }[] }>('/v1/ladder'),
  deleteLadderEntry: (token: string) => call<void>('/v1/ladder', { method: 'DELETE', body: JSON.stringify({ token }) }),
  uploadTransfer: (lookupId: string, blob: string) =>
    call<{ expiresInHours: number }>(`/v1/transfer/${lookupId}`, { method: 'PUT', body: JSON.stringify({ blob }) }),
  downloadTransfer: (lookupId: string) => call<{ blob: string }>(`/v1/transfer/${lookupId}`),
};
