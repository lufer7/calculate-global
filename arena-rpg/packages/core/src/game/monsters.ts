import { createRng } from '../random';
import type { BattleOutcome, BattlerInput } from './battle';
import { fight } from './battle';
import type { ClassId } from './classes';
import type { ItemInstance, Rarity } from './gear';
import { RESOURCE_IDS, gearTotal, rollEquipment, rollRarity } from './gear';

/**
 * Sefer (rev4): every zone has five creatures. Pick one and press "Saldır": the fight is
 * resolved at once (1 energy), with gold, XP and a chance of an item. Fast and repeatable.
 */
export type CreatureShape = 'beast' | 'wolf' | 'boar' | 'bear' | 'humanoid' | 'flyer' | 'serpent' | 'spider' | 'golem' | 'spirit' | 'dragon' | 'leech' | 'frog';

export interface Creature {
  id: string;
  zoneId: string;
  name: string;
  level: number;
  /** Fighting style borrowed from a class (speed/evasion vs. armour vs. magic). */
  style: ClassId;
  shape: CreatureShape;
  color: string;
  /** One short line under the picture. */
  blurb: string;
  /** Strength relative to a typical fighter of the same level (1 = even). */
  might: number;
}

export interface HuntZone {
  id: string;
  name: string;
  minLevel: number;
  goldMult: number;
  dropRarity: Record<Rarity, number>;
  /** Chance of hunter materials (leather, bone, meat) on a win. */
  materialChance: number;
}

export const HUNT_ZONES: Record<string, HuntZone> = {
  dark_forest: { id: 'dark_forest', name: 'Karanlık Orman', minLevel: 1, goldMult: 1, dropRarity: { common: 55, uncommon: 35, rare: 9, epic: 1, legendary: 0 }, materialChance: 0.3 },
  misty_marsh: { id: 'misty_marsh', name: 'Sisli Bataklık', minLevel: 13, goldMult: 1.1, dropRarity: { common: 40, uncommon: 40, rare: 16, epic: 4, legendary: 0 }, materialChance: 0.15 },
  abandoned_mines: { id: 'abandoned_mines', name: 'Terk Edilmiş Madenler', minLevel: 33, goldMult: 1.3, dropRarity: { common: 25, uncommon: 42, rare: 25, epic: 7, legendary: 1 }, materialChance: 0.08 },
  lost_lands: { id: 'lost_lands', name: 'Kayıp Diyarlar', minLevel: 58, goldMult: 1.4, dropRarity: { common: 10, uncommon: 40, rare: 35, epic: 12, legendary: 3 }, materialChance: 0.05 },
};

const c = (zoneId: string, id: string, name: string, level: number, style: ClassId, shape: CreatureShape, color: string, blurb: string, might = 0.85): Creature =>
  ({ id, zoneId, name, level, style, shape, color, blurb, might });

export const CREATURES: Creature[] = [
  c('dark_forest', 'red_fox', 'Kızıl Tilki', 1, 'scout', 'beast', '#b5582b', 'Çevik ama ürkek. Isırığı acıtır.', 0.7),
  c('dark_forest', 'wild_boar', 'Yaban Domuzu', 3, 'swordmaster', 'boar', '#6b5240', 'Kalın derili, öfkeyle saldırır.'),
  c('dark_forest', 'grey_wolf', 'Gri Kurt', 6, 'scout', 'wolf', '#7a8288', 'Sürüsünden kopmuş, aç bir kurt.'),
  c('dark_forest', 'forest_bandit', 'Orman Haydudu', 9, 'swordmaster', 'humanoid', '#4f6b3a', 'Paslı kılıcı ve bol cesareti var.'),
  c('dark_forest', 'old_bear', 'Yaşlı Ayı', 13, 'swordmaster', 'bear', '#5a3d2b', 'Ormanın efendisi. Pençesi ağır.', 0.95),

  c('misty_marsh', 'marsh_leech', 'Dev Sülük', 15, 'swordmaster', 'leech', '#4a3a3f', 'Yapışır, kan emer, bırakmaz.', 0.8),
  c('misty_marsh', 'reed_snake', 'Sazlık Yılanı', 19, 'scout', 'serpent', '#5d7a3c', 'Sazların arasından şimşek gibi çıkar.'),
  c('misty_marsh', 'frogman', 'Kurbağa Adam', 23, 'swordmaster', 'frog', '#3f6b52', 'Mızrağıyla bataklığın bekçisi.'),
  c('misty_marsh', 'fog_wraith', 'Sis Ruhu', 28, 'seer', 'spirit', '#a9b8c0', 'Kılıç içinden geçer, büyüsü üşütür.'),
  c('misty_marsh', 'marsh_witch', 'Bataklık Cadısı', 33, 'seer', 'humanoid', '#5a4a6b', 'Lanetleri zırhı dinlemez.', 0.95),

  c('abandoned_mines', 'cave_bat', 'Mağara Yarasası', 36, 'scout', 'flyer', '#3c3440', 'Karanlıkta sürü halinde gelir.', 0.8),
  c('abandoned_mines', 'giant_spider', 'Dev Örümcek', 41, 'scout', 'spider', '#2f2a2a', 'Ağını galerinin tavanına örmüş.'),
  c('abandoned_mines', 'lost_miner', 'Kayıp Madenci', 46, 'swordmaster', 'humanoid', '#7a6a4a', 'Kazması hâlâ keskin, aklı değil.'),
  c('abandoned_mines', 'stone_troll', 'Taş Trol', 52, 'swordmaster', 'golem', '#6a6a62', 'Yavaş ama bir vuruşu yeter.'),
  c('abandoned_mines', 'crystal_golem', 'Kristal Golem', 58, 'seer', 'golem', '#6fa8c0', 'Işığı kırar, büyüyle çarpar.', 0.95),

  c('lost_lands', 'shadow_wolf', 'Gölge Kurt', 62, 'scout', 'wolf', '#2c2840', 'Gölgeden gölgeye atlar.', 0.85),
  c('lost_lands', 'bone_archer', 'Kemik Okçu', 68, 'scout', 'humanoid', '#d8d2c0', 'Okları hiç bitmez.'),
  c('lost_lands', 'mirror_mage', 'Ayna Büyücüsü', 74, 'seer', 'spirit', '#b9a0d9', 'Seni sana karşı savaştırır.'),
  c('lost_lands', 'time_warden', 'Zaman Bekçisi', 82, 'swordmaster', 'golem', '#8a7a55', 'Yüzyıllardır aynı kapıyı bekler.'),
  c('lost_lands', 'realm_drake', 'Diyar Ejderi', 92, 'seer', 'dragon', '#7a2a2a', 'Diyarın son ve en yaşlı canavarı.', 1),
];

export const CREATURES_BY_ID = new Map(CREATURES.map((x) => [x.id, x]));
export const creaturesOf = (zoneId: string) => CREATURES.filter((x) => x.zoneId === zoneId);

/** Above this gap the creature's details read "???" in red. */
export const UNKNOWN_LEVEL_GAP = 5;

export function creatureBattler(cr: Creature): BattlerInput {
  // Equipped like a fighter of its level wearing common gear, scaled by its might.
  const gear = gearTotal(['sword', 'plate', 'helm', 'boots'].map((templateId) => ({ templateId, itemLevel: cr.level, rarity: 'common' as const, upgrade: 0 })));
  const m = cr.might;
  return {
    name: cr.name, class: cr.style, level: cr.level, skills: {},
    gear: { ...gear, damage: gear.damage * m, armor: gear.armor * m, hp: gear.hp * m, magic: cr.style === 'seer' ? 10 + cr.level * 1.5 * m : 0 },
  };
}

export interface HuntResult {
  won: boolean;
  outcome: BattleOutcome;
  gold: number;
  xp: number;
  /** Health left (0..1), never below 2% so a fighter is never "dead". */
  hpRatio: number;
  item: Omit<ItemInstance, 'id'> | null;
  material: Omit<ItemInstance, 'id'> | null;
}

/** One creature fight with its rewards; deterministic per seed (stored for support). */
export function huntCreature(input: { fighter: BattlerInput; creature: Creature; seed: number; goldBonus?: number; dropBonus?: number; night?: boolean }): HuntResult {
  const { creature: cr } = input;
  const zone = HUNT_ZONES[cr.zoneId]!;
  const outcome = fight(input.fighter, creatureBattler(cr), input.seed, { night: input.night, maxRounds: 30 });
  const won = outcome.winner === 'a';
  const rng = createRng(input.seed ^ 0x5bd1e995);
  const jitter = 0.8 + rng() * 0.4;
  const gold = won ? Math.round((8 + cr.level * 3.2) * zone.goldMult * jitter * (1 + (input.goldBonus ?? 0))) : 0;
  const xp = Math.round((6 + cr.level * 2.6) * (won ? 1 : 0.25));
  const dropChance = 0.1 + (input.dropBonus ?? 0);
  const item = won && rng() < dropChance ? rollEquipment(rng, cr.level, rollRarity(rng, zone.dropRarity)) : null;
  const material = won && rng() < zone.materialChance
    ? { templateId: RESOURCE_IDS[Math.floor(rng() * RESOURCE_IDS.length)]!, itemLevel: 1, rarity: 'common' as const, upgrade: 0, qty: 1 + Math.floor(rng() * 2) }
    : null;
  return { won, outcome, gold, xp, hpRatio: Math.max(0.02, outcome.hp.a / outcome.maxHp.a), item, material };
}
