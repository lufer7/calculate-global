import { createRng } from '../random';
import { battleProfile, powerScore } from './battle';
import type { ItemInstance, Rarity } from './gear';
import { FOOD_IDS, RESOURCE_IDS, gearTotal, rollEquipment, rollRarity } from './gear';
import type { Zone } from './expedition';

/**
 * Expedition stages: every zone is a short trail of 10 stages that get harder.
 * Clearing a stage unlocks the next one; cleared stages can be farmed again.
 */
export const STAGES_PER_ZONE = 10;

export type ZoneBias = 'wilds' | 'potions' | 'ore' | 'relics';

export interface ZoneStages {
  levelStep: number;
  bias: ZoneBias;
  /** What the zone is known for, shown on the map. */
  rewardText: string;
  stageNames: string[];
}

export const ZONE_STAGES: Record<string, ZoneStages> = {
  dark_forest: {
    levelStep: 2, bias: 'wilds', rewardText: 'Deri, kemik, av eti ve yiyecek',
    stageNames: ['Orman Girişi', 'Oduncu Kulübesi', 'Yosunlu Taşlar', 'Kurt İnleri', 'Yıkık Gözetleme Kulesi', 'Kara Göl', 'Avcı Mezarlığı', 'Dikenli Geçit', 'Yaşlı Meşe', 'Orman Kralı'],
  },
  misty_marsh: {
    levelStep: 3, bias: 'potions', rewardText: 'İksirler, yiyecek ve kayıp kervan sandıkları',
    stageNames: ['Sazlık Kıyısı', 'Batık Köprü', 'Sülük Gölü', 'Cadı Kulübesi', 'Sisli Ada', 'Kervan Enkazı', 'Bataklık Feneri', 'Çürük Değirmen', 'Kurbağa Sunağı', 'Sis Anası'],
  },
  abandoned_mines: {
    levelStep: 3, bias: 'ore', rewardText: 'Bol altın, silah ve zırh',
    stageNames: ['Maden Ağzı', 'Ray Yolu', 'Çökmüş Galeri', 'Kömür Ocağı', 'Yeraltı Pazarı', 'Damar Kuyusu', 'Su Basmış Kat', 'Kristal Mağara', 'Derin Ocak', 'Taş Dev'],
  },
  lost_lands: {
    levelStep: 4, bias: 'relics', rewardText: 'Nadir, destansı ve efsanevi eşyalar',
    stageNames: ['Sis Kapısı', 'Asılı Taşlar', 'Unutulmuş Yol', 'Yıldız Tapınağı', 'Kemik Çölü', 'Ayna Gölü', 'Sessiz Şehir', 'Zaman Kulesi', 'Son Köprü', 'Diyarın Bekçisi'],
  },
};

export function stageLevel(zone: Pick<Zone, 'id' | 'minLevel'>, stage: number): number {
  return Math.min(100, zone.minLevel + (stage - 1) * (ZONE_STAGES[zone.id]?.levelStep ?? 2));
}

export function stageDurationMs(zone: Pick<Zone, 'baseDurationMs'>, stage: number): number {
  return Math.round(zone.baseDurationMs * (1 + (stage - 1) * 0.12));
}

export const stageLootMultiplier = (stage: number) => 1 + (stage - 1) * 0.18;

const refCache = new Map<number, number>();
/** Power of a typical, reasonably equipped fighter of that level (the stage's "enemy strength"). */
export function referencePower(level: number): number {
  const cached = refCache.get(level);
  if (cached) return cached;
  const gear = gearTotal(['sword', 'shield', 'plate', 'helm', 'boots'].map((templateId) => ({ templateId, itemLevel: level, rarity: 'common' as const, upgrade: 0 })));
  const p = powerScore(battleProfile({ name: 'ref', class: 'swordmaster', level, skills: {}, gear }));
  refCache.set(level, p);
  return p;
}

/** The strongest member counts fully, every extra member adds a third of their power. */
export function partyPower(powers: number[]): number {
  const sorted = [...powers].sort((a, b) => b - a);
  return Math.round((sorted[0] ?? 0) + sorted.slice(1).reduce((s, p) => s + p * 0.35, 0));
}

/** Early stages are forgiving, the boss stage expects a well-geared party. */
export const stageDifficulty = (stage: number) => 0.55 + (stage - 1) * 0.045;

export function successChance(party: number, level: number, stage = 5): number {
  const ratio = party / (referencePower(level) * stageDifficulty(stage));
  return Math.max(0.1, Math.min(0.97, 0.55 + (ratio - 1) * 1.0));
}

/** Zone-flavoured extra loot on a successful stage; boss stages pay a guaranteed relic on first clear. */
export function zoneExtraItems(zoneId: string, seed: number, stage: number, level: number, firstBossClear: boolean): Omit<ItemInstance, 'id'>[] {
  const rng = createRng(seed ^ 0x27d4eb2d);
  const bias = ZONE_STAGES[zoneId]?.bias ?? 'wilds';
  const out: Omit<ItemInstance, 'id'>[] = [];
  const stack = (templateId: string, qty: number) => out.push({ templateId, itemLevel: 1, rarity: 'common', upgrade: 0, qty });
  const scale = 1 + Math.floor(stage / 3);
  if (bias === 'wilds') {
    for (let i = 0; i < 2; i++) stack(RESOURCE_IDS[Math.floor(rng() * RESOURCE_IDS.length)]!, scale + Math.floor(rng() * 2));
    if (rng() < 0.6) stack(FOOD_IDS[Math.floor(rng() * 3)]!, 1);
  }
  if (bias === 'potions') {
    if (rng() < 0.55) stack(['potion_heal', 'potion_haste', 'potion_luck'][Math.floor(rng() * 3)]!, 1);
    if (rng() < 0.5) stack(FOOD_IDS[1 + Math.floor(rng() * 3)]!, 1);
  }
  if (bias === 'ore' && rng() < 0.45) {
    const weights: Record<Rarity, number> = { common: 40, uncommon: 40, rare: 17, epic: 3, legendary: 0 };
    out.push(rollEquipment(rng, level, rollRarity(rng, weights)));
  }
  if (bias === 'relics' && rng() < 0.4) {
    const weights: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 60, epic: 32, legendary: 8 };
    out.push(rollEquipment(rng, level, rollRarity(rng, weights)));
  }
  if (firstBossClear) {
    const weights: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 55, epic: 38, legendary: 7 };
    out.push(rollEquipment(rng, level + 1, rollRarity(rng, weights)));
  }
  return out;
}

/** Gold multiplier by zone flavour (mines pay best, everything pays some gold). */
export const zoneGoldMultiplier = (zoneId: string) => (ZONE_STAGES[zoneId]?.bias === 'ore' ? 1.5 : 1);
