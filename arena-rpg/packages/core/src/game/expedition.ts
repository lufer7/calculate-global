import { sha256 } from '@noble/hashes/sha2.js';
import { utf8 } from '../encoding';
import type { Result } from '../result';
import { err, ok } from '../result';
import type { ClassId } from './classes';
import { accountPerks } from './classPerks';
import { GAME_CONFIG } from './config';
import type { Fighter } from './fighters';
import { isAvailable } from './fighters';

/** Design doc §6 – Ogame-style expeditions into the dark forests. */

export const REWARD_TIERS = ['nothing', 'common', 'rare', 'epic', 'legendary'] as const;
export type RewardTier = (typeof REWARD_TIERS)[number];
export const EVENTS = ['none', 'ambush', 'trap', 'cursed_chest', 'merchant', 'lost_treasure'] as const;
export type ExpeditionEvent = (typeof EVENTS)[number];
const BAD_EVENTS: readonly ExpeditionEvent[] = ['ambush', 'trap', 'cursed_chest'];

export interface Zone {
  id: string;
  name: string;
  minLevel: number;
  baseDurationMs: number;
  rewardWeights: Record<RewardTier, number>;
  eventWeights: Record<ExpeditionEvent, number>;
  /** Base injury chance per fighter at/above minLevel. */
  injuryChance: number;
  hidden?: boolean;
}

const MIN = 60_000;
export const ZONES: Record<string, Zone> = {
  dark_forest: {
    id: 'dark_forest', name: 'Karanlık Orman', minLevel: 1, baseDurationMs: 30 * MIN, injuryChance: 0.05,
    rewardWeights: { nothing: 25, common: 55, rare: 15, epic: 4, legendary: 1 },
    eventWeights: { none: 60, ambush: 10, trap: 8, cursed_chest: 5, merchant: 10, lost_treasure: 7 },
  },
  misty_marsh: {
    id: 'misty_marsh', name: 'Sisli Bataklık', minLevel: 20, baseDurationMs: 90 * MIN, injuryChance: 0.08,
    rewardWeights: { nothing: 20, common: 50, rare: 20, epic: 8, legendary: 2 },
    eventWeights: { none: 55, ambush: 12, trap: 10, cursed_chest: 6, merchant: 10, lost_treasure: 7 },
  },
  abandoned_mines: {
    id: 'abandoned_mines', name: 'Terk Edilmiş Madenler', minLevel: 45, baseDurationMs: 4 * 60 * MIN, injuryChance: 0.12,
    rewardWeights: { nothing: 15, common: 45, rare: 25, epic: 12, legendary: 3 },
    eventWeights: { none: 50, ambush: 14, trap: 12, cursed_chest: 8, merchant: 8, lost_treasure: 8 },
  },
  lost_lands: {
    id: 'lost_lands', name: 'Kayıp Diyarlar', minLevel: 60, baseDurationMs: 6 * 60 * MIN, injuryChance: 0.1,
    rewardWeights: { nothing: 10, common: 35, rare: 30, epic: 18, legendary: 7 },
    eventWeights: { none: 50, ambush: 10, trap: 10, cursed_chest: 5, merchant: 10, lost_treasure: 15 },
  },
};

/** Expedition slots come from research only; the Scout slot bonus moved to Keşif (`explorationSlots`). */
export function expeditionSlots(researchLevel: number, _highestScoutLevel = 0): number {
  const { slots_by_research, research_max_level } = GAME_CONFIG.expedition;
  return slots_by_research[Math.max(0, Math.min(researchLevel, research_max_level))]!;
}

export function highestScoutLevel(fighters: Pick<Fighter, 'class' | 'level' | 'status'>[], now: number): number {
  // An injured scout still counts for slots (doc: losing the source only blocks *new* sends – handled by callers).
  return fighters.filter((f) => f.class === 'scout').reduce((m, f) => Math.max(m, f.level), 0);
}

/**
 * Expedition party bonuses. Rev3: the Scout exploration skills now work on Keşif
 * (`explorationBonuses`), so expeditions are equal for every class; this stays as a hook.
 */
export interface PartyBonuses {
  durationReduction: number;
  rareChanceRelative: number;
  badEventReduction: number;
  injuryRecoveryReduction: number;
  extraRewardChance: number;
  canEnterHidden: boolean;
}

export function partyBonuses(_party: Pick<Fighter, 'skills'>[]): PartyBonuses {
  return { durationReduction: 0, rareChanceRelative: 0, badEventReduction: 0, injuryRecoveryReduction: 0, extraRewardChance: 0, canEnterHidden: true };
}

/** Stacked reductions (skill, Hız İksiri, …) never push below 40% of the base duration. */
export function expeditionDuration(zone: Zone, bonuses: PartyBonuses, extraReductions: number[] = []): number {
  const factor = [bonuses.durationReduction, ...extraReductions].reduce((f, r) => f * (1 - r), 1);
  return Math.round(zone.baseDurationMs * Math.max(GAME_CONFIG.expedition.min_duration_ratio, factor));
}

export interface ExpeditionRecord {
  id: string;
  zoneId: string;
  fighterIds: string[];
  startedAt: number;
  endsAt: number;
  baseDurationMs: number;
  seed: number;
}

export type StartError = 'unknown_zone' | 'hidden_zone' | 'empty_party' | 'fighter_busy' | 'no_free_slot';

export function planExpedition(input: {
  zoneId: string;
  party: Fighter[];
  allFighters: Fighter[];
  activeExpeditions: number;
  researchLevel: number;
  now: number;
  /** Class of the account's first fighter – grants account-wide perks. */
  mainClass?: ClassId | null;
  extraReductions?: number[];
}): Result<{ endsAt: number; durationMs: number; underLevel: string[] }, StartError> {
  const zone = Object.prototype.hasOwnProperty.call(ZONES, input.zoneId) ? ZONES[input.zoneId] : undefined;
  if (!zone) return err('unknown_zone');
  if (input.party.length === 0) return err('empty_party');
  if (input.party.some((f) => !isAvailable(f, input.now))) return err('fighter_busy');
  const bonuses = partyBonuses(input.party);
  if (zone.hidden && !bonuses.canEnterHidden) return err('hidden_zone');
  const slots = expeditionSlots(input.researchLevel, highestScoutLevel(input.allFighters, input.now));
  if (input.activeExpeditions >= slots) return err('no_free_slot');

  const durationMs = expeditionDuration(zone, bonuses, input.extraReductions ?? []);
  return ok({
    endsAt: input.now + durationMs,
    durationMs,
    underLevel: input.party.filter((f) => f.level < zone.minLevel).map((f) => f.id),
  });
}

function pick<K extends string>(weights: Record<K, number>, rng: () => number): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [k, w] of entries) {
    roll -= w;
    if (roll < 0) return k;
  }
  return entries[entries.length - 1]![0];
}

/** Scales rare+ weights by (1 + relative bonus), keeping total rare+ probability under the cap. */
export function boostedRewardWeights(base: Record<RewardTier, number>, relative: number): Record<RewardTier, number> {
  const rarePlus: RewardTier[] = ['rare', 'epic', 'legendary'];
  const total = REWARD_TIERS.reduce((s, t) => s + base[t], 0);
  const rareBase = rarePlus.reduce((s, t) => s + base[t], 0);
  const targetShare = Math.min(GAME_CONFIG.expedition.chance_cap, (rareBase / total) * (1 + relative));
  const scaleRare = (targetShare * total) / rareBase;
  const scaleRest = ((1 - targetShare) * total) / (total - rareBase);
  return Object.fromEntries(REWARD_TIERS.map((t) => [t, base[t] * (rarePlus.includes(t) ? scaleRare : scaleRest)])) as Record<RewardTier, number>;
}

export interface ExpeditionOutcome {
  reward: RewardTier;
  extraReward: RewardTier | null;
  event: ExpeditionEvent;
  /** Prophecy etc. multiply reward amounts, not tiers. */
  rewardMultiplier: number;
  injured: string[];
}

/**
 * Server-side resolution. `rng` must be seeded by the server and the seed stored with the
 * expedition record, so every roll is reproducible for audits/support ("loglanabilir RNG").
 */
export function resolveExpedition(
  zone: Zone,
  party: Pick<Fighter, 'id' | 'level' | 'skills'>[],
  rng: () => number,
  opts: { prophecyBonus?: number; mainClass?: ClassId | null; isProphecyZone?: boolean; extraRareRelative?: number } = {},
): ExpeditionOutcome {
  const bonuses = partyBonuses(party);
  const perks = accountPerks(opts.mainClass);
  const cap = GAME_CONFIG.expedition.chance_cap;
  // Skill and main-class bonuses are both relative; they add up before the cap.
  const rewardWeights = boostedRewardWeights(zone.rewardWeights, bonuses.rareChanceRelative + (opts.extraRareRelative ?? 0));

  const reward = pick(rewardWeights, rng);
  const extraReward = rng() < Math.min(cap, bonuses.extraRewardChance) ? pick(rewardWeights, rng) : null;

  const eventWeights = { ...zone.eventWeights };
  for (const e of BAD_EVENTS) eventWeights[e] *= 1 - Math.min(cap, bonuses.badEventReduction);
  const event = pick(eventWeights, rng);

  const injured = party
    .filter((f) => {
      const underLevel = Math.max(0, zone.minLevel - f.level);
      const eventRisk = event === 'ambush' || event === 'trap' ? 0.15 : 0;
      return rng() < Math.min(cap, zone.injuryChance + underLevel * 0.03 + eventRisk);
    })
    .map((f) => f.id);

  const prophecy = opts.isProphecyZone ? (opts.prophecyBonus ?? 0) + perks.prophecyBaseBonus : (opts.prophecyBonus ?? 0);
  return { reward, extraReward, event, rewardMultiplier: 1 + prophecy, injured };
}

/** Early recall: fighters walk back as long as they have been out; no reward. */
export function recallReturnTime(startedAt: number, now: number): number {
  return now + Math.max(0, now - startedAt);
}

/** Müneccim "Zaman Büküm": cut the remaining time by 25%, respecting the 40% floor. */
export function applyTimeWarp(exp: Pick<ExpeditionRecord, 'startedAt' | 'endsAt' | 'baseDurationMs'>, now: number): number {
  const remaining = Math.max(0, exp.endsAt - now);
  const warped = now + Math.round(remaining * (1 - GAME_CONFIG.seer.time_warp_reduction));
  return Math.max(warped, exp.startedAt + Math.round(exp.baseDurationMs * GAME_CONFIG.expedition.min_duration_ratio));
}

/** Daily prophecy: deterministic per server day + server secret, so it can never "be wrong". */
export function prophecyZone(dayKey: string, serverSecret: string): string {
  const visible = Object.values(ZONES).filter((z) => !z.hidden);
  const h = sha256(utf8.encode(`${serverSecret}:prophecy:${dayKey}`));
  return visible[h[0]! % visible.length]!.id;
}

/** Base loot per zone; reward tiers multiply it. Starting values – tune with live data. */
export const ZONE_LOOT: Record<string, { gold: number; xp: number }> = {
  dark_forest: { gold: 30, xp: 20 },
  misty_marsh: { gold: 90, xp: 55 },
  abandoned_mines: { gold: 220, xp: 130 },
  lost_lands: { gold: 400, xp: 220 },
};

const TIER_MULTIPLIER: Record<RewardTier, number> = { nothing: 0, common: 1, rare: 2.5, epic: 6, legendary: 15 };

/** Turns a rolled outcome into gold (for the account) and XP (per fighter). */
export function expeditionLoot(zoneId: string, outcome: ExpeditionOutcome, rng: () => number): { gold: number; xp: number } {
  const base = ZONE_LOOT[zoneId] ?? { gold: 0, xp: 0 };
  const jitter = () => 0.8 + rng() * 0.4;
  let gold = base.gold * TIER_MULTIPLIER[outcome.reward] * jitter();
  if (outcome.extraReward) gold += base.gold * TIER_MULTIPLIER[outcome.extraReward] * jitter();
  if (outcome.event === 'merchant') gold *= 1.1;
  if (outcome.event === 'lost_treasure') gold += base.gold * 2;
  if (outcome.event === 'cursed_chest') gold *= 0.5;
  gold *= outcome.rewardMultiplier;
  const xp = base.xp * (outcome.reward === 'nothing' ? 0.5 : 1) * jitter();
  return { gold: Math.round(gold), xp: Math.round(xp) };
}

/** Injury lasts as long as the trip, shortened by skills/perks, but never below 25%. */
export function injuryDurationMs(zone: Zone, reductions: number[]): number {
  const factor = reductions.reduce((f, r) => f * (1 - r), 1);
  return Math.round(zone.baseDurationMs * Math.max(0.25, factor));
}
