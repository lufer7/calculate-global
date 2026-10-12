import type { ClassId } from './classes';

/** Equipment slots on the paper doll. Rings use two slots. */
export const EQUIP_SLOTS = ['head', 'amulet', 'chest', 'main_hand', 'off_hand', 'hands', 'ring1', 'ring2', 'feet'] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];
export type TemplateSlot = Exclude<EquipSlot, 'ring1' | 'ring2'> | 'ring';

export const SLOT_NAMES: Record<EquipSlot, string> = {
  head: 'Baş', amulet: 'Kolye', chest: 'Gövde', main_hand: 'Silah', off_hand: 'Yan el',
  hands: 'Eller', ring1: 'Yüzük', ring2: 'Yüzük', feet: 'Ayaklar',
};

export function slotsFor(slot: TemplateSlot): EquipSlot[] {
  return slot === 'ring' ? ['ring1', 'ring2'] : [slot];
}

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];
export const RARITY_INFO: Record<Rarity, { name: string; statMult: number; priceMult: number; color: string }> = {
  common: { name: 'Sıradan', statMult: 1, priceMult: 1, color: '#b9b4a8' },
  uncommon: { name: 'Kaliteli', statMult: 1.25, priceMult: 2, color: '#6fbf5b' },
  rare: { name: 'Nadir', statMult: 1.6, priceMult: 4, color: '#4f9fe0' },
  epic: { name: 'Destansı', statMult: 2.1, priceMult: 9, color: '#b06ee0' },
  legendary: { name: 'Efsanevi', statMult: 2.8, priceMult: 20, color: '#e89a3c' },
};

export interface GearStats {
  damage: number;
  armor: number;
  hp: number;
  magic: number;
  crit: number; // ratio
  evasion: number; // ratio
  accuracy: number; // ratio
  speed: number;
}

export const ZERO_STATS: GearStats = { damage: 0, armor: 0, hp: 0, magic: 0, crit: 0, evasion: 0, accuracy: 0, speed: 0 };

export type ItemKind = 'equipment' | 'food' | 'potion' | 'resource';

export interface ItemTemplate {
  id: string;
  kind: ItemKind;
  name: string;
  /** Art key for the client's SVG icon set. */
  icon: string;
  basePrice: number;
  description?: string;
  // equipment
  slot?: TemplateSlot;
  classes?: ClassId[];
  stats?: Partial<GearStats>;
  // consumables
  heal?: number;
  stackable?: boolean;
}

const eq = (id: string, name: string, icon: string, slot: TemplateSlot, stats: Partial<GearStats>, basePrice: number, classes?: ClassId[]): ItemTemplate =>
  ({ id, kind: 'equipment', name, icon, slot, stats, basePrice, classes });

/**
 * Base equipment. Names get a material prefix by item level (Paslı → Demir → Çelik → Usta İşi),
 * stats scale with item level, rarity and blacksmith upgrades.
 */
export const ITEM_TEMPLATES: Record<string, ItemTemplate> = Object.fromEntries(
  ([
    // weapons
    eq('sword', 'Kılıç', 'sword', 'main_hand', { damage: 9, accuracy: 0.02 }, 40, ['swordmaster']),
    eq('axe', 'Balta', 'axe', 'main_hand', { damage: 11, crit: 0.01 }, 42, ['swordmaster']),
    eq('mace', 'Topuz', 'mace', 'main_hand', { damage: 10, armor: 2 }, 42, ['swordmaster']),
    eq('bow', 'Yay', 'bow', 'main_hand', { damage: 8, crit: 0.03 }, 40, ['scout']),
    eq('dagger', 'Hançer', 'dagger', 'main_hand', { damage: 7, evasion: 0.02, speed: 2 }, 38, ['scout']),
    eq('staff', 'Asa', 'staff', 'main_hand', { damage: 5, magic: 9 }, 40, ['seer']),
    eq('wand', 'Değnek', 'wand', 'main_hand', { damage: 4, magic: 7, speed: 2 }, 38, ['seer']),
    // off-hands
    eq('shield', 'Kalkan', 'shield', 'off_hand', { armor: 8, hp: 10 }, 35, ['swordmaster']),
    eq('quiver', 'Sadak', 'quiver', 'off_hand', { damage: 3, crit: 0.02 }, 35, ['scout']),
    eq('tome', 'Kitap', 'tome', 'off_hand', { magic: 5, accuracy: 0.02 }, 35, ['seer']),
    // armour (any class)
    eq('helm', 'Miğfer', 'helm', 'head', { armor: 5, hp: 8 }, 25),
    eq('hood', 'Başlık', 'hood', 'head', { armor: 2, evasion: 0.02 }, 25),
    eq('plate', 'Zırh', 'plate', 'chest', { armor: 10, hp: 15 }, 45),
    eq('jerkin', 'Deri Yelek', 'jerkin', 'chest', { armor: 5, evasion: 0.02, hp: 8 }, 40),
    eq('robe', 'Cüppe', 'robe', 'chest', { armor: 3, magic: 4, hp: 6 }, 40),
    eq('gloves', 'Eldiven', 'gloves', 'hands', { armor: 2, accuracy: 0.02 }, 20),
    eq('boots', 'Çizme', 'boots', 'feet', { armor: 2, speed: 2 }, 20),
    eq('amulet', 'Muska', 'amulet', 'amulet', { hp: 12, magic: 2 }, 50),
    eq('ring', 'Yüzük', 'ring', 'ring', { crit: 0.015, damage: 2 }, 45),
    // food (restores HP)
    { id: 'bread', kind: 'food', name: 'Somun Ekmek', icon: 'bread', basePrice: 6, heal: 0.2, stackable: true },
    { id: 'cheese', kind: 'food', name: 'Keçi Peyniri', icon: 'cheese', basePrice: 10, heal: 0.3, stackable: true },
    { id: 'fish', kind: 'food', name: 'Tütsülenmiş Balık', icon: 'fish', basePrice: 16, heal: 0.45, stackable: true },
    { id: 'roast', kind: 'food', name: 'Kuzu Çevirme', icon: 'roast', basePrice: 24, heal: 0.6, stackable: true },
    { id: 'honeycake', kind: 'food', name: 'Ballı Çörek', icon: 'honeycake', basePrice: 40, heal: 1, stackable: true },
    // potions
    { id: 'potion_heal', kind: 'potion', name: 'Şifa İksiri', icon: 'potion_red', basePrice: 60, stackable: true, description: 'Yaralı dövüşçüyü anında iyileştirir, canını doldurur.' },
    { id: 'potion_haste', kind: 'potion', name: 'Hız İksiri', icon: 'potion_blue', basePrice: 50, stackable: true, description: 'Devam eden bir seferin kalan süresini %10 kısaltır.' },
    { id: 'potion_luck', kind: 'potion', name: 'Şans İksiri', icon: 'potion_green', basePrice: 70, stackable: true, description: 'Gönderilecek seferde nadir ödül şansı +%15 (göreli).' },
    { id: 'potion_forget', kind: 'potion', name: 'Unutma İksiri', icon: 'potion_purple', basePrice: 400, stackable: true, description: 'Bir dövüşçünün yetenek puanlarını iade eder.' },
    // resources (Avcılık → Simya)
    { id: 'leather', kind: 'resource', name: 'Deri', icon: 'leather', basePrice: 8, stackable: true },
    { id: 'bone', kind: 'resource', name: 'Kemik', icon: 'bone', basePrice: 8, stackable: true },
    { id: 'game_meat', kind: 'resource', name: 'Av Eti', icon: 'game_meat', basePrice: 8, stackable: true },
  ] as ItemTemplate[]).map((t) => [t.id, t]),
);

export const FOOD_IDS = ['bread', 'cheese', 'fish', 'roast', 'honeycake'];
export const RESOURCE_IDS = ['leather', 'bone', 'game_meat'];
export const EQUIPMENT_IDS = Object.values(ITEM_TEMPLATES).filter((t) => t.kind === 'equipment').map((t) => t.id);

export interface ItemInstance {
  id: string;
  templateId: string;
  itemLevel: number;
  rarity: Rarity;
  upgrade: number;
  qty: number;
}

export const MAX_ITEM_UPGRADE = 10;
export const INVENTORY_SLOTS = 48;

export function template(id: string): ItemTemplate | undefined {
  return Object.prototype.hasOwnProperty.call(ITEM_TEMPLATES, id) ? ITEM_TEMPLATES[id] : undefined;
}

const MATERIALS: [number, string][] = [[60, 'Usta İşi'], [35, 'Çelik'], [15, 'Demir'], [0, 'Paslı']];
export function itemName(item: Pick<ItemInstance, 'templateId' | 'itemLevel' | 'upgrade'>): string {
  const t = template(item.templateId);
  if (!t) return item.templateId;
  if (t.kind !== 'equipment') return t.name;
  const material = MATERIALS.find(([lvl]) => item.itemLevel >= lvl)![1];
  const base = ['plate', 'jerkin', 'robe', 'gloves', 'boots', 'hood', 'amulet', 'ring'].includes(t.id) && material === 'Paslı' ? 'Eski' : material;
  return `${base} ${t.name}${item.upgrade > 0 ? ` +${item.upgrade}` : ''}`;
}

/** Final stats of one equipment piece. */
export function itemStats(item: Pick<ItemInstance, 'templateId' | 'itemLevel' | 'rarity' | 'upgrade'>): GearStats {
  const t = template(item.templateId);
  if (!t || t.kind !== 'equipment' || !t.stats) return { ...ZERO_STATS };
  const scale = (1 + item.itemLevel * 0.09) * RARITY_INFO[item.rarity].statMult * (1 + item.upgrade * 0.08);
  const ratioScale = RARITY_INFO[item.rarity].statMult * (1 + item.upgrade * 0.04);
  const out = { ...ZERO_STATS };
  for (const [k, v] of Object.entries(t.stats) as [keyof GearStats, number][]) {
    out[k] = k === 'crit' || k === 'evasion' || k === 'accuracy' ? Math.round(v * ratioScale * 1000) / 1000 : Math.round(v * scale);
  }
  return out;
}

export function addGear(a: GearStats, b: GearStats): GearStats {
  const out = { ...a };
  for (const k of Object.keys(out) as (keyof GearStats)[]) out[k] = Math.round((a[k] + b[k]) * 1000) / 1000;
  return out;
}

export function gearTotal(items: Pick<ItemInstance, 'templateId' | 'itemLevel' | 'rarity' | 'upgrade'>[]): GearStats {
  return items.reduce((acc, i) => addGear(acc, itemStats(i)), { ...ZERO_STATS });
}

export function itemPrice(item: Pick<ItemInstance, 'templateId' | 'itemLevel' | 'rarity' | 'upgrade'>): number {
  const t = template(item.templateId);
  if (!t) return 0;
  if (t.kind !== 'equipment') return t.basePrice;
  return Math.round(t.basePrice * (1 + item.itemLevel * 0.15) * RARITY_INFO[item.rarity].priceMult * (1 + item.upgrade * 0.2));
}

export const sellPrice = (item: Parameters<typeof itemPrice>[0]) => Math.max(1, Math.floor(itemPrice(item) * 0.25));

/**
 * "+ basma": merging a duplicate (same item, same rarity) into an item gives +1.
 * Gold cost grows ~1.85× per step, so +5 needs five duplicates and a real gold investment.
 */
export function upgradeCost(item: Pick<ItemInstance, 'templateId' | 'itemLevel' | 'rarity' | 'upgrade'>, reduction = 0): number {
  const base = itemPrice({ ...item, upgrade: 0 });
  return Math.max(5, Math.round(base * 0.4 * 1.85 ** item.upgrade * (1 - Math.min(0.6, reduction))));
}

export type MergeError = 'not_equipment' | 'not_same_item' | 'same_item' | 'max_upgrade';

/** Same template and same rarity ("aynı item, aynı renk"); the result keeps the higher level and upgrade, then +1. */
export function canMerge(target: Pick<ItemInstance, 'id' | 'templateId' | 'rarity' | 'upgrade'>, source: Pick<ItemInstance, 'id' | 'templateId' | 'rarity' | 'upgrade'>): MergeError | null {
  if (target.id === source.id) return 'same_item';
  if (template(target.templateId)?.kind !== 'equipment') return 'not_equipment';
  if (target.templateId !== source.templateId || target.rarity !== source.rarity) return 'not_same_item';
  if (Math.max(target.upgrade, source.upgrade) >= MAX_ITEM_UPGRADE) return 'max_upgrade';
  return null;
}

export type EquipError = 'not_equipment' | 'wrong_class' | 'level_too_low' | 'wrong_slot';

/** Fighters may wear items up to 2 levels above their own; weapons/off-hands are class-bound. */
export function canEquip(item: Pick<ItemInstance, 'templateId' | 'itemLevel'>, fighter: { class: ClassId; level: number }, slot: EquipSlot): EquipError | null {
  const t = template(item.templateId);
  if (!t || t.kind !== 'equipment' || !t.slot) return 'not_equipment';
  if (!slotsFor(t.slot).includes(slot)) return 'wrong_slot';
  if (t.classes && !t.classes.includes(fighter.class)) return 'wrong_class';
  if (item.itemLevel > fighter.level + 2) return 'level_too_low';
  return null;
}

/** Random equipment piece around a level (market stock, expedition loot, arena NPCs). */
export function rollEquipment(rng: () => number, level: number, rarity: Rarity, classFilter?: ClassId): Omit<ItemInstance, 'id'> {
  const pool = EQUIPMENT_IDS.filter((id) => {
    const cls = ITEM_TEMPLATES[id]!.classes;
    return !classFilter || !cls || cls.includes(classFilter);
  });
  const templateId = pool[Math.floor(rng() * pool.length)]!;
  const itemLevel = Math.max(1, Math.min(100, level + Math.floor(rng() * 5) - 2));
  return { templateId, itemLevel, rarity, upgrade: 0, qty: 1 };
}

export function rollRarity(rng: () => number, weights: Record<Rarity, number>): Rarity {
  const total = RARITIES.reduce((s, r) => s + weights[r], 0);
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= weights[r];
    if (roll < 0) return r;
  }
  return 'common';
}
