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

const REQUEST_TIMEOUT_MS = 12_000;

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};
export const getToken = () => token;

/** The only network client in the app: JSON in/out, Bearer token, no cookies. */
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  // Without a timeout an unreachable server makes buttons look like they do nothing.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      credentials: 'omit',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 0, null);
  } finally {
    clearTimeout(timer);
  }
  const data = res.status === 204 ? null : ((await res.json().catch(() => null)) as Record<string, unknown> | null);
  if (!res.ok) throw new ApiError(String(data?.error ?? `http_${res.status}`), res.status, data);
  return data as T;
}

export interface ItemView {
  id: string;
  templateId: string;
  kind: 'equipment' | 'food' | 'potion' | 'resource';
  icon: string;
  name: string;
  itemLevel: number;
  rarity: game.Rarity;
  upgrade: number;
  qty: number;
  slot: game.TemplateSlot | null;
  classes: game.ClassId[] | null;
  stats: game.GearStats | null;
  heal: number | null;
  description: string | null;
  sellPrice: number;
  upgradeCost: number | null;
  fighterId: string | null;
  equippedSlot: game.EquipSlot | null;
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
  equipment: ItemView[];
  profile: game.BattleProfile;
  power: number;
  arena: { points: number; wins: number; losses: number; readyAt: number | null };
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
  luckPotions: number;
}

export interface MarketOffer { offerId: string; section: 'equipment' | 'food' | 'potion'; price: number; soldOut: boolean; item: ItemView }
export interface ArenaOpponent { id: string; name: string; class: game.ClassId; level: number; power: number; owner?: string; points?: number }
export interface ArenaInfo {
  fighterId: string; readyAt: number | null; hpRatio: number; minHp: number;
  npcs: ArenaOpponent[]; players: ArenaOpponent[];
  ranking: { name: string; class: game.ClassId; level: number; points: number; wins: number; owner: string }[];
}
export interface FightResult {
  won: boolean; seed: number; outcome: game.BattleOutcome;
  me: { name: string; class: game.ClassId; level: number }; foe: { name: string; class: game.ClassId; level: number; owner?: string };
  rewards: { gold: number; xp: number; points: number; levelsGained: number }; hpRatio: number;
}
export interface AlchemyInfo {
  seers: { id: string; name: string; rank: number }[];
  resources: Record<string, number>;
  recipes: (game.Recipe & { outputName: string; icon: string })[];
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
  kind: 'expedition' | 'expedition_recalled' | 'research' | 'alchemy';
  title: string;
  at: number;
  read: boolean;
  body: Record<string, unknown>;
}

/** Quick reachability check for the sign-in screen. */
export async function pingServer(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${apiBaseUrl()}/health`, { signal: controller.signal, credentials: 'omit' });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
  startExpedition: (zoneId: string, fighterIds: string[], useLuck = false) =>
    call<{ id: string; endsAt: number; underLevel: string[] }>('/v1/game/expeditions', 'POST', { zoneId, fighterIds, useLuck }),
  inventory: () => call<{ capacity: number; used: number; smithReduction: number; items: ItemView[] }>('/v1/game/inventory'),
  equip: (itemId: string, fighterId: string, slot?: game.EquipSlot) => call<{ slot: game.EquipSlot }>(`/v1/game/items/${itemId}/equip`, 'POST', { fighterId, slot }),
  unequip: (itemId: string) => call<void>(`/v1/game/items/${itemId}/unequip`, 'POST', {}),
  sell: (itemId: string, qty?: number) => call<{ gold: number }>(`/v1/game/items/${itemId}/sell`, 'POST', { qty }),
  upgrade: (itemId: string) => call<{ upgrade: number; cost: number }>(`/v1/game/items/${itemId}/upgrade`, 'POST', {}),
  use: (itemId: string, target: { fighterId?: string; expeditionId?: string }) => call<Record<string, unknown>>(`/v1/game/items/${itemId}/use`, 'POST', target),
  market: () => call<{ nextRefresh: number; offers: MarketOffer[] }>('/v1/game/market'),
  buy: (offerId: string) => call<{ gold: number }>('/v1/game/market/buy', 'POST', { offerId }),
  arena: (fighterId: string) => call<ArenaInfo>(`/v1/game/arena?fighterId=${encodeURIComponent(fighterId)}`),
  fight: (fighterId: string, opponent: { type: 'npc' | 'player'; id: string }) => call<FightResult>('/v1/game/arena/fight', 'POST', { fighterId, opponent }),
  alchemy: () => call<AlchemyInfo>('/v1/game/alchemy'),
  craft: (fighterId: string, recipeId: string) => call<{ qty: number }>('/v1/game/alchemy/craft', 'POST', { fighterId, recipeId }),
  recall: (id: string) => call<{ returnsAt: number }>(`/v1/game/expeditions/${id}/recall`, 'POST', {}),
  reports: () => call<{ reports: Report[] }>('/v1/game/reports'),
  markReportsRead: () => call<void>('/v1/game/reports/read', 'POST', {}),
  startResearch: (id: string) => call<{ until: number; cost: number }>('/v1/game/research', 'POST', { id }),
};
