/**
 * Rasathane (rev4): a research tree in four branches. One research at a time per account.
 * Every research has a real, server-applied effect (see `researchEffects`).
 */
export type ResearchBranch = 'war' | 'hunt' | 'trade' | 'healing';

export const RESEARCH_BRANCHES: Record<ResearchBranch, { name: string; blurb: string }> = {
  war: { name: 'Savaş', blurb: 'Daha sert vuruşlar, daha sağlam zırh, daha çok enerji.' },
  hunt: { name: 'Av ve Keşif', blurb: 'Seferlerde ve keşiflerde daha çok ganimet.' },
  trade: { name: 'Ticaret', blurb: 'Pazarda kazanç, daha büyük heybe, altınını koru.' },
  healing: { name: 'Şifa', blurb: 'Daha hızlı iyileşme ve ucuz iksir.' },
};

export interface ResearchEffects {
  damage: number;
  armor: number;
  energyMax: number;
  energyRegenCutMs: number;
  arenaGold: number;
  huntGold: number;
  huntDrop: number;
  explorationSlots: number;
  explorationGold: number;
  marketDiscount: number;
  sellBonus: number;
  bagSlots: number;
  plunderProtection: number;
  restHeal: number;
  injuryReduction: number;
  alchemyDiscount: number;
  restEnergy: number;
}

export interface ResearchDefinition {
  id: string;
  name: string;
  branch: ResearchBranch;
  /** "{v}" is replaced with the total effect at a level. */
  description: string;
  maxLevel: number;
  requires?: { id: string; level: number };
  effect: keyof ResearchEffects;
  perLevel: number;
  /** Shown value: per level × level, formatted as % or a plain number. */
  format: 'pct' | 'num' | 'sec';
  baseCost: number;
  baseMinutes: number;
  cost: (nextLevel: number) => number;
  durationMs: (nextLevel: number) => number;
}

const MIN = 60_000;
const r = (d: Omit<ResearchDefinition, 'cost' | 'durationMs'>): ResearchDefinition => ({
  ...d,
  cost: (lvl) => Math.round(d.baseCost * 2.2 ** (lvl - 1)),
  durationMs: (lvl) => Math.round(d.baseMinutes * MIN * lvl ** 1.5),
});

const LIST: ResearchDefinition[] = [
  // Savaş
  r({ id: 'iron_drill', name: 'Demir Talimi', branch: 'war', description: 'Bütün dövüşçülerin hasarı +{v}.', maxLevel: 5, effect: 'damage', perLevel: 0.03, format: 'pct', baseCost: 120, baseMinutes: 15 }),
  r({ id: 'shield_wall', name: 'Kalkan Duvarı', branch: 'war', description: 'Bütün dövüşçülerin zırhı +{v}.', maxLevel: 5, requires: { id: 'iron_drill', level: 1 }, effect: 'armor', perLevel: 0.04, format: 'pct', baseCost: 150, baseMinutes: 20 }),
  r({ id: 'stamina', name: 'Dayanıklılık', branch: 'war', description: 'En yüksek enerji +{v}.', maxLevel: 5, requires: { id: 'iron_drill', level: 2 }, effect: 'energyMax', perLevel: 2, format: 'num', baseCost: 200, baseMinutes: 25 }),
  r({ id: 'second_wind', name: 'İkinci Nefes', branch: 'war', description: 'Enerji {v} daha sık dolar.', maxLevel: 5, requires: { id: 'stamina', level: 2 }, effect: 'energyRegenCutMs', perLevel: 20_000, format: 'sec', baseCost: 300, baseMinutes: 35 }),
  r({ id: 'arena_glory', name: 'Arena Şanı', branch: 'war', description: 'Arenada kazanılan altın +{v}.', maxLevel: 5, requires: { id: 'shield_wall', level: 2 }, effect: 'arenaGold', perLevel: 0.08, format: 'pct', baseCost: 250, baseMinutes: 30 }),
  // Av ve Keşif
  r({ id: 'hunters_eye', name: 'Av Bilgisi', branch: 'hunt', description: 'Sefer yaratıklarından düşen altın +{v}.', maxLevel: 5, effect: 'huntGold', perLevel: 0.05, format: 'pct', baseCost: 100, baseMinutes: 15 }),
  r({ id: 'trophy_lore', name: 'Ganimet Bilgisi', branch: 'hunt', description: 'Yaratıklardan eşya düşme şansı +{v} puan.', maxLevel: 5, requires: { id: 'hunters_eye', level: 1 }, effect: 'huntDrop', perLevel: 0.015, format: 'pct', baseCost: 180, baseMinutes: 25 }),
  r({ id: 'cartography', name: 'Haritacılık', branch: 'hunt', description: 'Keşif yuvası +{v}.', maxLevel: 2, requires: { id: 'hunters_eye', level: 2 }, effect: 'explorationSlots', perLevel: 1, format: 'num', baseCost: 450, baseMinutes: 60 }),
  r({ id: 'far_roads', name: 'Uzak Yollar', branch: 'hunt', description: 'Keşiflerden gelen altın +{v}.', maxLevel: 5, requires: { id: 'cartography', level: 1 }, effect: 'explorationGold', perLevel: 0.06, format: 'pct', baseCost: 300, baseMinutes: 40 }),
  // Ticaret
  r({ id: 'haggling', name: 'Pazarlık', branch: 'trade', description: 'Salı Pazarı fiyatları −{v}.', maxLevel: 5, effect: 'marketDiscount', perLevel: 0.03, format: 'pct', baseCost: 100, baseMinutes: 15 }),
  r({ id: 'merchant_web', name: 'Tüccar Ağı', branch: 'trade', description: 'Tüccara satış fiyatı +{v}.', maxLevel: 5, requires: { id: 'haggling', level: 1 }, effect: 'sellBonus', perLevel: 0.08, format: 'pct', baseCost: 150, baseMinutes: 20 }),
  r({ id: 'big_bags', name: 'Büyük Heybe', branch: 'trade', description: 'Çete çantası +{v} yuva.', maxLevel: 4, requires: { id: 'haggling', level: 2 }, effect: 'bagSlots', perLevel: 6, format: 'num', baseCost: 250, baseMinutes: 30 }),
  r({ id: 'vault', name: 'Gizli Kasa', branch: 'trade', description: 'Arenada yenilince çalınan altın −{v}.', maxLevel: 5, requires: { id: 'merchant_web', level: 2 }, effect: 'plunderProtection', perLevel: 0.08, format: 'pct', baseCost: 300, baseMinutes: 40 }),
  // Şifa
  r({ id: 'herbal', name: 'Şifalı Otlar', branch: 'healing', description: 'Camide iyileşme hızı +{v}.', maxLevel: 5, effect: 'restHeal', perLevel: 0.15, format: 'pct', baseCost: 100, baseMinutes: 15 }),
  r({ id: 'bandages', name: 'Sargı Bezi', branch: 'healing', description: 'Yaralanma süreleri −{v}.', maxLevel: 5, requires: { id: 'herbal', level: 1 }, effect: 'injuryReduction', perLevel: 0.08, format: 'pct', baseCost: 150, baseMinutes: 20 }),
  r({ id: 'apothecary', name: 'Aktar Ustalığı', branch: 'healing', description: 'İksir kaynatma altını −{v}.', maxLevel: 4, requires: { id: 'herbal', level: 2 }, effect: 'alchemyDiscount', perLevel: 0.12, format: 'pct', baseCost: 200, baseMinutes: 25 }),
  r({ id: 'deep_rest', name: 'Derin Uyku', branch: 'healing', description: 'Camide dinlenenlerin enerjisi {v} daha hızlı dolar.', maxLevel: 4, requires: { id: 'bandages', level: 2 }, effect: 'restEnergy', perLevel: 0.25, format: 'pct', baseCost: 300, baseMinutes: 40 }),
];

export const RESEARCH: Record<string, ResearchDefinition> = Object.fromEntries(LIST.map((d) => [d.id, d]));

export const NO_RESEARCH: ResearchEffects = {
  damage: 0, armor: 0, energyMax: 0, energyRegenCutMs: 0, arenaGold: 0, huntGold: 0, huntDrop: 0, explorationSlots: 0, explorationGold: 0,
  marketDiscount: 0, sellBonus: 0, bagSlots: 0, plunderProtection: 0, restHeal: 0, injuryReduction: 0, alchemyDiscount: 0, restEnergy: 0,
};

/** Sum of every finished research level (unknown ids, e.g. from older versions, are ignored). */
export function researchEffects(levels: Record<string, number>): ResearchEffects {
  const out = { ...NO_RESEARCH };
  for (const [id, lvl] of Object.entries(levels)) {
    const d = RESEARCH[id];
    if (d && lvl > 0) out[d.effect] += d.perLevel * Math.min(lvl, d.maxLevel);
  }
  return out;
}

export function researchValueText(d: ResearchDefinition, level: number): string {
  const v = d.perLevel * level;
  return d.format === 'pct' ? `%${Math.round(v * 1000) / 10}` : d.format === 'sec' ? `${Math.round(v / 1000)} sn` : String(v);
}

export type ResearchStartError = 'unknown_research' | 'max_level' | 'research_locked';

export function canResearch(levels: Record<string, number>, id: string): ResearchStartError | null {
  const d = RESEARCH[id];
  if (!d) return 'unknown_research';
  if ((levels[id] ?? 0) >= d.maxLevel) return 'max_level';
  if (d.requires && (levels[d.requires.id] ?? 0) < d.requires.level) return 'research_locked';
  return null;
}

export function researchDuration(def: ResearchDefinition, nextLevel: number, reductions: number[]): number {
  const factor = reductions.reduce((f, x) => f * (1 - x), 1);
  return Math.round(def.durationMs(nextLevel) * Math.max(0.4, factor));
}
