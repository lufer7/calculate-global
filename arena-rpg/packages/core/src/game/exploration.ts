import { createRng } from '../random';
import { accountPerks } from './classPerks';
import type { ClassId } from './classes';
import type { Fighter } from './fighters';
import type { ItemInstance, Rarity } from './gear';
import { FOOD_IDS, RESOURCE_IDS, rollEquipment, rollRarity } from './gear';
import { SKILLS_BY_ID, skillValue } from './skills';

/**
 * Keşif: Ogame-style long exploration. The player picks the one-way travel time and the
 * time spent exploring with sliders and sees the exact return clock, so fighters can be
 * sent out e.g. until the next morning. Rewards are random and better than expeditions;
 * a longer trip brings more gold and a few more finds, but barely better odds per find.
 */
const MIN = 60_000;
const HOUR = 60 * MIN;

export const EXPLORATION = {
  stepMs: 15 * MIN,
  travelMinMs: 30 * MIN, // one way → minimum round trip 1 hour
  travelMaxMs: 6 * HOUR,
  exploreMinMs: 0,
  exploreMaxMs: 12 * HOUR,
  maxFinds: 4,
  scoutSlotPerLevels: 25,
} as const;

/** 1 slot, +1 for every 25 levels of the account's highest Scout (Gözcü privilege). */
export function explorationSlots(highestScoutLevel: number): number {
  return 1 + Math.floor(highestScoutLevel / EXPLORATION.scoutSlotPerLevels);
}

export interface ExplorationBonuses {
  /** Covers more ground per hour: more gold and finds for the same time. */
  pace: number;
  rareRelative: number;
  injuryReduction: number;
  recoveryReduction: number;
  extraFindChance: number;
  lostLands: boolean;
}

/** Scout skills and the Kâşifler Yolu main-class perk work here (not on expeditions). Same skill across the party → max. */
export function explorationBonuses(party: Pick<Fighter, 'skills'>[], mainClass?: ClassId | null): ExplorationBonuses {
  const best = (id: string) => {
    const skill = SKILLS_BY_ID.get(id)!;
    return party.reduce((m, f) => Math.max(m, skillValue(skill, f.skills[id] ?? 0)), 0);
  };
  const perks = accountPerks(mainClass);
  return {
    pace: best('swift_steps') + perks.explorationPace,
    rareRelative: best('treasure_hunter') + perks.explorationRareRelative,
    injuryReduction: best('trap_sense'),
    recoveryReduction: best('pathfinding'),
    extraFindChance: best('explorer_spirit'),
    lostLands: best('lost_lands') > 0,
  };
}

export type ExplorationError = 'empty_party' | 'invalid_time' | 'fighter_busy' | 'no_free_slot';

export function validTimes(travelMs: number, exploreMs: number): boolean {
  const { stepMs, travelMinMs, travelMaxMs, exploreMinMs, exploreMaxMs } = EXPLORATION;
  return Number.isInteger(travelMs) && Number.isInteger(exploreMs)
    && travelMs >= travelMinMs && travelMs <= travelMaxMs && exploreMs >= exploreMinMs && exploreMs <= exploreMaxMs
    && travelMs % stepMs === 0 && exploreMs % stepMs === 0;
}

export const explorationTotalMs = (travelMs: number, exploreMs: number) => travelMs * 2 + exploreMs;

/** Number of finds: 1 base + 1 per 3 effective exploring hours (cap 4). Shown to the player as a range. */
export function findCount(exploreMs: number, pace: number): number {
  return Math.min(EXPLORATION.maxFinds, 1 + Math.floor((exploreMs * (1 + pace)) / (3 * HOUR)));
}

const FIND_KINDS = ['equipment', 'cache', 'potions', 'supplies', 'nothing'] as const;
export type FindKind = (typeof FIND_KINDS)[number];
const FIND_WEIGHTS: Record<FindKind, number> = { equipment: 42, cache: 22, potions: 16, supplies: 12, nothing: 8 };
/** Better than any expedition table: no commons at all. */
const BASE_RARITY: Record<Rarity, number> = { common: 0, uncommon: 46, rare: 36, epic: 14, legendary: 4 };

export function explorationRarityWeights(b: Pick<ExplorationBonuses, 'rareRelative' | 'lostLands'>, travelMs: number): Record<Rarity, number> {
  // Farther lands help only a little (+2% relative per travel hour, max +12%).
  const rel = Math.min(0.6, b.rareRelative + Math.min(0.12, (travelMs / HOUR) * 0.02));
  return {
    common: 0,
    uncommon: BASE_RARITY.uncommon,
    rare: BASE_RARITY.rare * (1 + rel),
    epic: BASE_RARITY.epic * (1 + rel),
    legendary: BASE_RARITY.legendary * (1 + rel) * (b.lostLands ? 2 : 1),
  };
}

export interface ExplorationFind {
  kind: FindKind;
  gold: number;
  items: Omit<ItemInstance, 'id'>[];
}

export interface ExplorationOutcome {
  gold: number;
  xp: number;
  finds: ExplorationFind[];
  injured: string[];
}

/** Server-side resolution with the stored seed (reproducible for support/audits). */
export function resolveExploration(input: {
  seed: number;
  travelMs: number;
  exploreMs: number;
  party: Pick<Fighter, 'id' | 'level' | 'skills'>[];
  mainClass?: ClassId | null;
  /** Şans İksiri used when sending (+15% relative). */
  extraRareRelative?: number;
}): ExplorationOutcome {
  const rng = createRng(input.seed);
  const b = explorationBonuses(input.party, input.mainClass);
  const level = Math.max(...input.party.map((f) => f.level), 1);
  const totalH = explorationTotalMs(input.travelMs, input.exploreMs) / HOUR;
  const exploreH = (input.exploreMs / HOUR) * (1 + b.pace);
  const goldRate = 30 + level * 6; // per hour away
  const gold = Math.round((goldRate * totalH * 0.5 + goldRate * exploreH) * (0.85 + rng() * 0.3));
  const xp = Math.round((10 + level * 2) * (totalH * 0.5 + exploreH));

  const rarity = explorationRarityWeights({ ...b, rareRelative: b.rareRelative + (input.extraRareRelative ?? 0) }, input.travelMs);
  let count = findCount(input.exploreMs, b.pace);
  if (rng() < Math.min(0.75, b.extraFindChance)) count += 1;
  const finds: ExplorationFind[] = [];
  for (let i = 0; i < count; i++) {
    const kind = pickKind(rng);
    const find: ExplorationFind = { kind, gold: 0, items: [] };
    if (kind === 'equipment') find.items.push(rollEquipment(rng, level, rollRarity(rng, rarity)));
    if (kind === 'cache') find.gold = Math.round(goldRate * (2 + rng() * 4));
    if (kind === 'potions') find.items.push({ templateId: ['potion_heal', 'potion_haste', 'potion_luck', 'potion_luck'][Math.floor(rng() * 4)]!, itemLevel: 1, rarity: 'common', upgrade: 0, qty: 1 + Math.floor(rng() * 2) });
    if (kind === 'supplies') {
      find.items.push({ templateId: FOOD_IDS[2 + Math.floor(rng() * 3)]!, itemLevel: 1, rarity: 'common', upgrade: 0, qty: 2 });
      find.items.push({ templateId: RESOURCE_IDS[Math.floor(rng() * RESOURCE_IDS.length)]!, itemLevel: 1, rarity: 'common', upgrade: 0, qty: 2 + Math.floor(rng() * 3) });
    }
    finds.push(find);
  }
  const injuryChance = 0.06 * (1 - Math.min(0.75, b.injuryReduction));
  const injured = input.party.filter(() => rng() < injuryChance).map((f) => f.id);
  return { gold, xp, finds, injured };
}

/** What the UI shows before sending: average gold (±15%), XP and the number of finds. */
export function explorationEstimate(input: { travelMs: number; exploreMs: number; level: number; pace: number }) {
  const totalH = explorationTotalMs(input.travelMs, input.exploreMs) / HOUR;
  const exploreH = (input.exploreMs / HOUR) * (1 + input.pace);
  const goldRate = 30 + input.level * 6;
  const avg = goldRate * totalH * 0.5 + goldRate * exploreH;
  return {
    goldMin: Math.round(avg * 0.85),
    goldMax: Math.round(avg * 1.15),
    xp: Math.round((10 + input.level * 2) * (totalH * 0.5 + exploreH)),
    finds: findCount(input.exploreMs, input.pace),
  };
}

function pickKind(rng: () => number): FindKind {
  const total = FIND_KINDS.reduce((s, k) => s + FIND_WEIGHTS[k], 0);
  let roll = rng() * total;
  for (const k of FIND_KINDS) {
    roll -= FIND_WEIGHTS[k];
    if (roll < 0) return k;
  }
  return 'nothing';
}

/** Injury after a keşif: an hour per 4 hours away (min 30 min), shortened by Yol Bilgisi. */
export function explorationInjuryMs(totalMs: number, recoveryReduction: number): number {
  return Math.round(Math.max(30 * MIN, totalMs / 4) * (1 - Math.min(0.75, recoveryReduction)));
}

/** Early recall: fighters turn around at once and need as long to come back as they have been away (max the travel time). */
export function explorationRecallReturn(startedAt: number, travelMs: number, now: number): number {
  return now + Math.min(travelMs, Math.max(0, now - startedAt));
}
