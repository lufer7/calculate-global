import { sha256 } from '@noble/hashes/sha2.js';
import type { OriginId } from './character';
import { isOrigin, statBudget } from './character';
import type { CombatantSetup } from './combat';
import { utf8 } from './encoding';
import type { Slot } from './items';
import { MAX_UPGRADE, SLOTS, getTemplate } from './items';
import type { RandomBytes } from './random';
import { toHex } from './random';
import type { Result } from './result';
import { err, ok } from './result';
import type { SaveGame } from './save';
import { BASE_STAT, MAX_LEVEL, STAT_KEYS, sumStats } from './stats';

/**
 * What the client sends for PvP. Deliberately contains NO name, NO character id,
 * NO device data – only the "build" needed to fight.
 */
export interface PvpSnapshot {
  v: 1;
  level: number;
  origin: OriginId;
  stats: Record<(typeof STAT_KEYS)[number], number>;
  equipment: Partial<Record<Slot, { templateId: string; upgradeLevel: number }>>;
}

export function buildSnapshot(save: SaveGame): PvpSnapshot {
  const c = save.character;
  const equipment: PvpSnapshot['equipment'] = {};
  for (const slot of SLOTS) {
    const item = c.equipment[slot];
    if (item) equipment[slot] = { templateId: item.templateId, upgradeLevel: item.upgradeLevel };
  }
  return { v: 1, level: c.level, origin: c.origin, stats: { ...c.stats }, equipment };
}

export type SnapshotError = 'bad_shape' | 'bad_level' | 'bad_stats' | 'bad_item';

/**
 * Server-side legality check. Progress lives on the device so we cannot trust it;
 * instead we bound what is *possible* at a given level. A tampered save can at most
 * reach a perfectly legal build – it can never exceed the rules.
 */
export function validateSnapshot(input: unknown): Result<PvpSnapshot, SnapshotError> {
  if (typeof input !== 'object' || input === null) return err('bad_shape');
  const s = input as Record<string, unknown>;
  if (s.v !== 1 || typeof s.origin !== 'string' || !isOrigin(s.origin)) return err('bad_shape');
  if (!Number.isInteger(s.level) || (s.level as number) < 1 || (s.level as number) > MAX_LEVEL) return err('bad_level');
  const level = s.level as number;

  const stats = s.stats as Record<string, unknown> | undefined;
  if (typeof stats !== 'object' || stats === null || Object.keys(stats).length !== STAT_KEYS.length) return err('bad_stats');
  for (const k of STAT_KEYS) {
    const v = stats[k];
    if (!Number.isInteger(v) || (v as number) < BASE_STAT) return err('bad_stats');
  }
  if (sumStats(stats as PvpSnapshot['stats']) > statBudget(s.origin, level)) return err('bad_stats');

  const equipment = s.equipment as Record<string, unknown> | undefined;
  if (typeof equipment !== 'object' || equipment === null) return err('bad_shape');
  const cleanEquipment: PvpSnapshot['equipment'] = {};
  for (const [slot, raw] of Object.entries(equipment)) {
    if (!(SLOTS as readonly string[]).includes(slot) || typeof raw !== 'object' || raw === null) return err('bad_item');
    const { templateId, upgradeLevel } = raw as Record<string, unknown>;
    const t = typeof templateId === 'string' ? getTemplate(templateId) : undefined;
    if (!t || t.slot !== slot || t.requiredLevel > level) return err('bad_item');
    if (!Number.isInteger(upgradeLevel) || (upgradeLevel as number) < 0 || (upgradeLevel as number) > MAX_UPGRADE) return err('bad_item');
    cleanEquipment[slot as Slot] = { templateId: t.id, upgradeLevel: upgradeLevel as number };
  }

  // Rebuild the object so unknown fields (anything identifying) are dropped.
  return ok({
    v: 1,
    level,
    origin: s.origin,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, stats[k] as number])) as PvpSnapshot['stats'],
    equipment: cleanEquipment,
  });
}

export function snapshotToCombatant(s: PvpSnapshot): CombatantSetup {
  return { level: s.level, stats: s.stats, equipment: s.equipment };
}

/** Client: random secret kept on device. Rotate each season to prevent long-term linkability. */
export function generateLadderToken(random: RandomBytes): string {
  return toHex(random(32));
}

/** Server: public anonymous id = hash(token). The token itself is never stored. */
export function ladderIdFromToken(token: string): string {
  return toHex(sha256(utf8.encode(`arena-rpg/ladder/v1:${token}`))).slice(0, 32);
}

export function isValidLadderToken(token: unknown): token is string {
  return typeof token === 'string' && /^[0-9a-f]{64}$/.test(token);
}

export function eloDelta(rating: number, opponent: number, score: 0 | 0.5 | 1, k = 32): number {
  const expected = 1 / (1 + 10 ** ((opponent - rating) / 400));
  return Math.round(k * (score - expected));
}
