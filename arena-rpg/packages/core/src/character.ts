import type { ItemInstance, Slot } from './items';
import type { RandomBytes } from './random';
import { randomId } from './random';
import type { Result } from './result';
import { err, ok } from './result';
import type { Stats } from './stats';
import { BASE_STAT, CREATION_POINTS, MAX_LEVEL, POINTS_PER_LEVEL, STAT_KEYS, addStats, emptyStats, sumStats } from './stats';

/** Original backgrounds. Display text is localized on the client by id. */
export const ORIGINS = {
  dockhand: { strength: 2, vitality: 1 },
  archivist: { intellect: 2, fortune: 1 },
  courier: { agility: 2, vitality: 1 },
} as const satisfies Record<string, Partial<Stats>>;
export type OriginId = keyof typeof ORIGINS;
export const ORIGIN_IDS = Object.keys(ORIGINS) as OriginId[];

export interface Character {
  /** Random, device-local id. Never sent to any server. */
  id: string;
  /** Player-typed name. Stays on the device; online features use a generated name instead. */
  name: string;
  origin: OriginId;
  level: number;
  xp: number;
  stats: Stats;
  unspentPoints: number;
  equipment: Partial<Record<Slot, ItemInstance>>;
  createdAt: number;
}

export interface CreateCharacterInput {
  name: string;
  origin: OriginId;
  allocation: Partial<Stats>;
}

export type CreateCharacterError = 'invalid_name' | 'invalid_origin' | 'invalid_allocation';

const NAME_PATTERN = /^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u;

export function normalizeName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function isValidName(name: string): boolean {
  return name.length >= 3 && name.length <= 16 && NAME_PATTERN.test(name);
}

export function isOrigin(value: string): value is OriginId {
  return Object.prototype.hasOwnProperty.call(ORIGINS, value);
}

/** Total base stat points a character of `level` may have (used by PvP validation too). */
export function statBudget(origin: OriginId, level: number): number {
  return BASE_STAT * STAT_KEYS.length + CREATION_POINTS + sumStats(ORIGINS[origin]) + (level - 1) * POINTS_PER_LEVEL;
}

export function createCharacter(
  input: CreateCharacterInput,
  deps: { random: RandomBytes; now: number },
): Result<Character, CreateCharacterError> {
  const name = normalizeName(input.name);
  if (!isValidName(name)) return err('invalid_name');
  if (!isOrigin(input.origin)) return err('invalid_origin');

  for (const k of Object.keys(input.allocation)) {
    if (!(STAT_KEYS as readonly string[]).includes(k)) return err('invalid_allocation');
  }
  for (const k of STAT_KEYS) {
    const v = input.allocation[k] ?? 0;
    if (!Number.isInteger(v) || v < 0) return err('invalid_allocation');
  }
  if (sumStats(input.allocation) !== CREATION_POINTS) return err('invalid_allocation');

  const stats = addStats(addStats(emptyStats(BASE_STAT), ORIGINS[input.origin]), input.allocation);
  return ok({
    id: randomId(deps.random),
    name,
    origin: input.origin,
    level: 1,
    xp: 0,
    stats,
    unspentPoints: 0,
    equipment: {},
    createdAt: deps.now,
  });
}

export function xpToNextLevel(level: number): number {
  return Math.round(50 * level ** 1.5);
}

export function gainXp(character: Character, amount: number): Character {
  let { level, xp, unspentPoints } = character;
  xp += Math.max(0, Math.floor(amount));
  while (level < MAX_LEVEL && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    unspentPoints += POINTS_PER_LEVEL;
  }
  if (level === MAX_LEVEL) xp = 0;
  return { ...character, level, xp, unspentPoints };
}

export function spendPoint(character: Character, stat: (typeof STAT_KEYS)[number]): Result<Character, 'no_points'> {
  if (character.unspentPoints <= 0) return err('no_points');
  return ok({
    ...character,
    unspentPoints: character.unspentPoints - 1,
    stats: { ...character.stats, [stat]: character.stats[stat] + 1 },
  });
}
