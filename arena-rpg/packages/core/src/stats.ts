export const STAT_KEYS = ['strength', 'agility', 'intellect', 'vitality', 'fortune'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const BASE_STAT = 5;
export const CREATION_POINTS = 10;
export const POINTS_PER_LEVEL = 3;
export const MAX_LEVEL = 60;

export function emptyStats(value = 0): Stats {
  return { strength: value, agility: value, intellect: value, vitality: value, fortune: value };
}

export function addStats(a: Stats, b: Partial<Stats>): Stats {
  const out = { ...a };
  for (const k of STAT_KEYS) out[k] += b[k] ?? 0;
  return out;
}

export function sumStats(s: Partial<Stats>): number {
  return STAT_KEYS.reduce((acc, k) => acc + (s[k] ?? 0), 0);
}

export interface DerivedStats {
  maxHp: number;
  damageMin: number;
  damageMax: number;
  armor: number;
  critChance: number; // 0..1
  dodgeChance: number; // 0..1
  initiative: number;
}

export interface GearTotals {
  bonus: Partial<Stats>;
  armor: number;
  damage: number;
}

/** Original formulas – tune freely, they are not taken from any existing game. */
export function deriveStats(level: number, base: Stats, gear: GearTotals): DerivedStats {
  const s = addStats(base, gear.bonus);
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const weapon = gear.damage + Math.floor(s.strength * 0.8);
  return {
    maxHp: 40 + level * 12 + s.vitality * 9,
    damageMin: Math.max(1, Math.floor(weapon * 0.75)),
    damageMax: Math.max(2, Math.ceil(weapon * 1.25)),
    armor: gear.armor + Math.floor(s.vitality * 0.5),
    critChance: clamp(0.03 + s.fortune * 0.004 + s.intellect * 0.002, 0.5),
    dodgeChance: clamp(0.02 + s.agility * 0.004, 0.4),
    initiative: s.agility * 2 + s.intellect,
  };
}
