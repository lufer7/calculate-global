import { sha256 } from '@noble/hashes/sha2.js';
import { utf8 } from '../encoding';
import { createRng } from '../random';
import type { ClassId } from './classes';
import { CLASS_IDS } from './classes';
import type { ItemInstance, Rarity } from './gear';
import type { BattlerInput } from './battle';
import { FOOD_IDS, RESOURCE_IDS, gearTotal, itemPrice, rollEquipment, rollRarity, template } from './gear';
import type { RewardTier } from './expedition';

const HOUR = 3_600_000;

export function seedFrom(...parts: (string | number)[]): number {
  const h = sha256(utf8.encode(parts.join(':')));
  return ((h[0]! << 24) | (h[1]! << 16) | (h[2]! << 8) | h[3]!) >>> 0;
}

// ---------------------------------------------------------------------------
// Salı Pazarı – NPC merchant. Stock is personal and refreshes every hour.
// ---------------------------------------------------------------------------

export interface MarketOffer {
  offerId: string;
  section: 'equipment' | 'food' | 'potion';
  item: Omit<ItemInstance, 'id'>;
  price: number;
}

const GAME_HOUR_MS = HOUR;
export function marketHourKey(now: number, speed = 1): number {
  return Math.floor((now * speed) / GAME_HOUR_MS);
}

export function nextMarketRefresh(now: number, speed = 1): number {
  return Math.ceil(((marketHourKey(now, speed) + 1) * GAME_HOUR_MS) / speed);
}

export function marketStock(accountId: string, hourKey: number, accountLevel: number, mainClass: ClassId | null, secret: string): MarketOffer[] {
  const rng = createRng(seedFrom(secret, 'market', accountId, hourKey));
  const offers: MarketOffer[] = [];
  const weights: Record<Rarity, number> = { common: 52, uncommon: 32, rare: 12, epic: 3.5, legendary: 0.5 };
  for (let i = 0; i < 8; i++) {
    // Half of the stock leans towards the gang's main class so there is always something useful.
    const item = rollEquipment(rng, accountLevel, rollRarity(rng, weights), i < 4 && mainClass ? mainClass : undefined);
    offers.push({ offerId: `e${i}`, section: 'equipment', item, price: itemPrice(item) });
  }
  const foods = [...FOOD_IDS].sort(() => rng() - 0.5).slice(0, 4);
  foods.forEach((id, i) => {
    const qty = 1 + Math.floor(rng() * 3);
    offers.push({ offerId: `f${i}`, section: 'food', item: { templateId: id, itemLevel: 1, rarity: 'common', upgrade: 0, qty }, price: template(id)!.basePrice * qty });
  });
  ['potion_heal', 'potion_haste', 'potion_luck', 'potion_forget'].forEach((id, i) => {
    offers.push({ offerId: `p${i}`, section: 'potion', item: { templateId: id, itemLevel: 1, rarity: 'common', upgrade: 0, qty: 1 }, price: template(id)!.basePrice });
  });
  return offers;
}

// ---------------------------------------------------------------------------
// Expedition loot items
// ---------------------------------------------------------------------------

const TIER_ITEM: Record<RewardTier, { chance: number; weights: Record<Rarity, number> } | null> = {
  nothing: null,
  common: { chance: 0.35, weights: { common: 70, uncommon: 30, rare: 0, epic: 0, legendary: 0 } },
  rare: { chance: 0.9, weights: { common: 0, uncommon: 55, rare: 45, epic: 0, legendary: 0 } },
  epic: { chance: 1, weights: { common: 0, uncommon: 0, rare: 60, epic: 40, legendary: 0 } },
  legendary: { chance: 1, weights: { common: 0, uncommon: 0, rare: 0, epic: 55, legendary: 45 } },
};

/** Items found on an expedition: equipment by tier, sometimes food. */
export function expeditionItems(seed: number, tier: RewardTier, extraTier: RewardTier | null, level: number): Omit<ItemInstance, 'id'>[] {
  const rng = createRng(seed ^ 0x5bd1e995);
  const out: Omit<ItemInstance, 'id'>[] = [];
  for (const t of [tier, extraTier]) {
    if (!t) continue;
    const spec = TIER_ITEM[t];
    if (spec && rng() < spec.chance) out.push(rollEquipment(rng, level, rollRarity(rng, spec.weights)));
    if (t !== 'nothing' && rng() < 0.4) out.push({ templateId: FOOD_IDS[Math.floor(rng() * 3)]!, itemLevel: 1, rarity: 'common', upgrade: 0, qty: 1 + Math.floor(rng() * 2) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Arena
// ---------------------------------------------------------------------------

const NPC_FIRST = ['Kemikkıran', 'Tozkoparan', 'Yarımkulak', 'Demirdiş', 'Karayel', 'Çatalbıyık', 'Sessiz', 'Topal', 'Kızıl', 'Uzunkol', 'Kurşunpençe', 'Gecekuşu'];
const NPC_LAST = ['Bayram', 'Selim', 'Durmuş', 'Hatun', 'Nuri', 'Zeyno', 'Rıza', 'Peri', 'Sabri', 'Gülfem', 'Emin', 'Naciye'];

export interface ArenaNpc {
  id: string;
  battler: BattlerInput;
  equipment: Omit<ItemInstance, 'id'>[];
}

/** Three NPC gladiators around the fighter's level; refresh every game hour or after each fight. */
export function arenaNpcs(fighterId: string, fighterLevel: number, roll: number, secret: string): ArenaNpc[] {
  return [-1, 0, 2].map((offset, i) => {
    const rng = createRng(seedFrom(secret, 'arena', fighterId, roll, i));
    const level = Math.max(1, fighterLevel + offset);
    const cls = CLASS_IDS[Math.floor(rng() * 3)]!;
    const gearWeights: Record<Rarity, number> = { common: 60, uncommon: 35, rare: 5, epic: 0, legendary: 0 };
    const slots = ['main_hand', 'chest', 'head', 'off_hand', 'feet'];
    const equipment = slots.map(() => rollEquipment(rng, level, rollRarity(rng, gearWeights), cls)).slice(0, 3 + Math.floor(rng() * 3));
    const name = `${NPC_FIRST[Math.floor(rng() * NPC_FIRST.length)]} ${NPC_LAST[Math.floor(rng() * NPC_LAST.length)]}`;
    return { id: `npc${i}`, equipment, battler: { name, class: cls, level, skills: {}, gear: gearTotal(equipment) } };
  });
}

export function arenaRewards(won: boolean, level: number, vsPlayer: boolean, fameBonus = 0) {
  if (!won) return { gold: 0, xp: Math.round(4 + level * 1.5), points: vsPlayer ? -4 : -2 };
  return {
    gold: Math.round((10 + level * 4) * (vsPlayer ? 1.5 : 1)),
    xp: Math.round(8 + level * 3),
    points: Math.round((vsPlayer ? 12 : 6) * (1 + fameBonus)),
  };
}

export const ARENA_COOLDOWN_MS = 10 * 60_000;
export const ARENA_MIN_HP = 0.15;
export const ARENA_HP_LOSS = 0.15;

// ---------------------------------------------------------------------------
// HP regeneration, hunting, alchemy
// ---------------------------------------------------------------------------

/** Fighters recover 10% health per hour while not injured. */
export const HP_REGEN_PER_HOUR = 0.1;
export function regenHp(hpRatio: number, elapsedMs: number): number {
  return Math.min(1, hpRatio + (Math.max(0, elapsedMs) / HOUR) * HP_REGEN_PER_HOUR);
}

/** Scout "Avcılık": rank N yields N resources per hour, picked deterministically. */
export function huntingYield(rank: number, elapsedMs: number, seed: number): Record<string, number> {
  const units = Math.floor((Math.max(0, elapsedMs) / HOUR) * rank);
  const rng = createRng(seed);
  const out: Record<string, number> = {};
  for (let i = 0; i < Math.min(units, 500); i++) {
    const id = RESOURCE_IDS[Math.floor(rng() * RESOURCE_IDS.length)]!;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

export interface Recipe {
  id: string;
  output: string;
  minRank: number;
  gold: number;
  inputs: Record<string, number>;
}

/** Seer "İksir Yapımı": rank unlocks recipes. Avcı resources are the ingredients → trade between classes. */
export const RECIPES: Recipe[] = [
  { id: 'heal', output: 'potion_heal', minRank: 1, gold: 15, inputs: { game_meat: 2, bone: 1 } },
  { id: 'haste', output: 'potion_haste', minRank: 2, gold: 25, inputs: { leather: 2 } },
  { id: 'luck', output: 'potion_luck', minRank: 3, gold: 40, inputs: { bone: 2, leather: 1 } },
  { id: 'forget', output: 'potion_forget', minRank: 5, gold: 150, inputs: { game_meat: 3, bone: 3, leather: 3 } },
];
