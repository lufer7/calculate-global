import type { ClassId } from './classes';
import { GAME_CONFIG } from './config';
import type { SkillRanks } from './skills';

/** Design doc "Meşguliyet kuralı": one activity at a time. */
export type FighterStatus =
  | { kind: 'idle' } // hazır, çeteyle birlikte
  | { kind: 'expedition'; expeditionId: string; until: number }
  | { kind: 'exploration'; until: number } // keşif
  | { kind: 'resting'; until: number } // camide dinleniyor
  | { kind: 'arena'; until: number }
  | { kind: 'injured'; until: number };

export interface Fighter {
  id: string;
  name: string;
  class: ClassId;
  level: number;
  xp: number;
  /** 0..1 – arena losses reduce it; food from Salı Pazarı restores it. */
  hpRatio: number;
  skills: SkillRanks;
  status: FighterStatus;
}

/**
 * Account level = highest fighter level on the account.
 * (Assumption: the doc does not define account level separately.)
 */
export function accountLevel(fighters: Pick<Fighter, 'level'>[]): number {
  return fighters.reduce((max, f) => Math.max(max, f.level), 1);
}

export function fighterSlots(level: number): number {
  return GAME_CONFIG.fighter.unlock_levels.filter((l) => level >= l).length;
}

/** Status after lazily resolving timers against server time. */
export function effectiveStatus(f: Pick<Fighter, 'status'>, now: number): FighterStatus {
  return f.status.kind !== 'idle' && now >= f.status.until ? { kind: 'idle' } : f.status;
}

export function isAvailable(f: Pick<Fighter, 'status'>, now: number): boolean {
  return effectiveStatus(f, now).kind === 'idle';
}

/** Catch-up XP: lagging fighters get +50% until close to the account's best fighter. */
export function xpMultiplier(fighterLevel: number, highestLevel: number): number {
  const { catchup_xp_bonus, catchup_level_gap } = GAME_CONFIG.fighter;
  return highestLevel - fighterLevel > catchup_level_gap ? 1 + catchup_xp_bonus : 1;
}

export function xpToNext(level: number): number {
  return Math.round(60 * level ** 1.6);
}

export function addXp(f: Pick<Fighter, 'level' | 'xp'>, amount: number): { level: number; xp: number; levelsGained: number } {
  let { level, xp } = f;
  const start = level;
  xp += Math.max(0, Math.floor(amount));
  while (level < GAME_CONFIG.fighter.max_level && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
  }
  if (level === GAME_CONFIG.fighter.max_level) xp = 0;
  return { level, xp, levelsGained: level - start };
}
