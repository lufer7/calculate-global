import type { game } from '@arena/core';
import { apiBaseUrl } from '../config';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly data: Record<string, unknown> | null,
  ) {
    super(code);
  }
}

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};

/** The only network client in the app: JSON in/out, Bearer token, no cookies. */
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      credentials: 'omit',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 0, null);
  }
  const data = res.status === 204 ? null : ((await res.json().catch(() => null)) as Record<string, unknown> | null);
  if (!res.ok) throw new ApiError(String(data?.error ?? `http_${res.status}`), res.status, data);
  return data as T;
}

export interface FighterView {
  id: string;
  name: string;
  class: game.ClassId;
  level: number;
  xp: number;
  xpToNext: number;
  hpRatio: number;
  status: 'idle' | 'expedition' | 'injured' | 'arena';
  statusUntil: number | null;
  skills: Record<string, number>;
  skillPoints: number;
  respecFree: boolean;
}

export interface GameState {
  serverTime: number;
  gameSpeed: number;
  account: {
    displayName: string;
    gold: number;
    mainClass: game.ClassId | null;
    mainClassPerk: game.MainClassPerk | null;
    accountLevel: number;
    fighterSlots: number;
    research: Record<string, number>;
    activeResearch: { id: string; level: number; until: number } | null;
  };
  expeditionSlots: number;
  prophecyZone: string | null;
  fighters: FighterView[];
  expeditions: { id: string; zoneId: string; fighterIds: string[]; startedAt: number; endsAt: number; recalled: boolean }[];
  unreadReports: number;
}

export interface DataRequest {
  id: string;
  kind: 'access' | 'rectification' | 'erasure' | 'objection' | 'other';
  message: string;
  status: 'open' | 'answered' | 'rejected';
  created_at: number;
  due_at: number;
  answered_at: number | null;
  answer: string | null;
}

export interface Report {
  id: number;
  kind: 'expedition' | 'expedition_recalled' | 'research';
  title: string;
  at: number;
  read: boolean;
  body: Record<string, unknown>;
}

export const api = {
  register: (b: { email: string; password: string; acceptTerms: boolean; privacyNoticeAck: boolean; ageConfirmed: boolean; marketingConsent: boolean; termsVersion: string; privacyVersion: string }) =>
    call<{ status: string }>('/v1/auth/register', 'POST', b),
  verify: (email: string, code: string) => call<{ token: string }>('/v1/auth/verify', 'POST', { email, code }),
  login: (email: string, password: string) => call<{ token: string; needsLegalAcceptance: boolean }>('/v1/auth/login', 'POST', { email, password }),
  logout: () => call<void>('/v1/auth/logout', 'POST'),
  me: () => call<{ id: string; email: string; displayName: string; mainClass: game.ClassId | null; fighters: unknown[]; marketingConsent: boolean; needsLegalAcceptance: boolean }>('/v1/me'),
  exportData: () => call<Record<string, unknown>>('/v1/me/export'),
  changeEmail: (email: string, password: string) => call<{ status: string }>('/v1/me/email', 'POST', { email, password }),
  confirmEmail: (code: string) => call<void>('/v1/me/email/confirm', 'POST', { code }),
  changePassword: (current: string, next: string) => call<void>('/v1/me/password', 'POST', { current, next }),
  revokeOtherSessions: () => call<void>('/v1/me/sessions/revoke-others', 'POST', {}),
  dataRequests: () => call<{ requests: DataRequest[] }>('/v1/me/requests'),
  createDataRequest: (kind: DataRequest['kind'], message: string) => call<{ id: string; dueAt: number }>('/v1/me/requests', 'POST', { kind, message }),
  acceptLegal: () => call<void>('/v1/me/legal', 'POST', { acceptTerms: true, privacyNoticeAck: true }),
  setMarketing: (consent: boolean) => call<void>('/v1/me/marketing', 'POST', { consent }),
  deleteAccount: (password: string) => call<void>('/v1/account', 'DELETE', { password }),
  createFighter: (name: string, cls: game.ClassId) => call<{ id: string }>('/v1/fighters', 'POST', { name, class: cls }),
  state: () => call<GameState>('/v1/game/state'),
  rankUp: (fighterId: string, skillId: string) => call<{ skills: Record<string, number> }>(`/v1/game/fighters/${fighterId}/skills`, 'POST', { skillId }),
  respec: (fighterId: string) => call<{ skills: Record<string, number> }>(`/v1/game/fighters/${fighterId}/respec`, 'POST', {}),
  startExpedition: (zoneId: string, fighterIds: string[]) =>
    call<{ id: string; endsAt: number; leavesCastleEmpty: boolean; underLevel: string[] }>('/v1/game/expeditions', 'POST', { zoneId, fighterIds }),
  recall: (id: string) => call<{ returnsAt: number }>(`/v1/game/expeditions/${id}/recall`, 'POST', {}),
  reports: () => call<{ reports: Report[] }>('/v1/game/reports'),
  markReportsRead: () => call<void>('/v1/game/reports/read', 'POST', {}),
  startResearch: (id: string) => call<{ until: number; cost: number }>('/v1/game/research', 'POST', { id }),
};
