import type { RandomBytes } from './random';
import { randomId } from './random';
import type { GearTotals, Stats } from './stats';
import { STAT_KEYS } from './stats';

export const SLOTS = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'charm'] as const;
export type Slot = (typeof SLOTS)[number];

export interface ItemTemplate {
  id: string;
  slot: Slot;
  requiredLevel: number;
  price: number;
  damage?: number;
  armor?: number;
  bonus?: Partial<Stats>;
  /** Cosmetic items (e.g. sold via IAP) must never add power – keeps PvP fair without server-side receipts. */
  cosmetic?: boolean;
}

export interface ItemInstance {
  uid: string;
  templateId: string;
  upgradeLevel: number;
}

export const MAX_UPGRADE = 10;

/** Original starter catalog. Display names live in the client's i18n files, keyed by id. */
export const ITEM_CATALOG: Record<string, ItemTemplate> = {
  rusty_cleaver: { id: 'rusty_cleaver', slot: 'weapon', requiredLevel: 1, price: 20, damage: 4 },
  reed_spear: { id: 'reed_spear', slot: 'weapon', requiredLevel: 3, price: 55, damage: 6, bonus: { agility: 1 } },
  quarry_maul: { id: 'quarry_maul', slot: 'weapon', requiredLevel: 6, price: 140, damage: 10, bonus: { strength: 2 } },
  hide_buckler: { id: 'hide_buckler', slot: 'offhand', requiredLevel: 2, price: 35, armor: 3 },
  sackcloth_hood: { id: 'sackcloth_hood', slot: 'head', requiredLevel: 1, price: 15, armor: 1 },
  stitched_vest: { id: 'stitched_vest', slot: 'body', requiredLevel: 1, price: 25, armor: 3 },
  wrapped_gloves: { id: 'wrapped_gloves', slot: 'hands', requiredLevel: 2, price: 18, armor: 1, bonus: { strength: 1 } },
  sandal_straps: { id: 'sandal_straps', slot: 'feet', requiredLevel: 1, price: 12, armor: 1, bonus: { agility: 1 } },
  tin_token: { id: 'tin_token', slot: 'charm', requiredLevel: 4, price: 80, bonus: { fortune: 2 } },
  ember_plume: { id: 'ember_plume', slot: 'head', requiredLevel: 1, price: 0, cosmetic: true },
};

export function getTemplate(id: string): ItemTemplate | undefined {
  return Object.prototype.hasOwnProperty.call(ITEM_CATALOG, id) ? ITEM_CATALOG[id] : undefined;
}

export function createItem(templateId: string, random: RandomBytes): ItemInstance {
  if (!getTemplate(templateId)) throw new Error(`unknown item ${templateId}`);
  return { uid: randomId(random, 8), templateId, upgradeLevel: 0 };
}

/** Blacksmith: each +1 adds ~10% of base damage/armor (min 1). */
export function itemPower(item: Pick<ItemInstance, 'templateId' | 'upgradeLevel'>) {
  const t = getTemplate(item.templateId);
  if (!t || t.cosmetic) return { damage: 0, armor: 0, bonus: {} as Partial<Stats> };
  const scale = (v: number | undefined) =>
    v ? v + item.upgradeLevel * Math.max(1, Math.round(v * 0.1)) : 0;
  return { damage: scale(t.damage), armor: scale(t.armor), bonus: t.bonus ?? {} };
}

export function upgradeCost(item: ItemInstance): number {
  const t = getTemplate(item.templateId);
  if (!t) throw new Error('unknown item');
  return Math.round((t.price || 10) * 0.5 * (item.upgradeLevel + 1) ** 1.6);
}

export function gearTotals(equipment: Partial<Record<Slot, Pick<ItemInstance, 'templateId' | 'upgradeLevel'>>>): GearTotals {
  const totals: GearTotals = { bonus: {}, armor: 0, damage: 0 };
  for (const slot of SLOTS) {
    const item = equipment[slot];
    if (!item) continue;
    const p = itemPower(item);
    totals.armor += p.armor;
    totals.damage += p.damage;
    for (const k of STAT_KEYS) {
      const v = p.bonus[k];
      if (v) totals.bonus[k] = (totals.bonus[k] ?? 0) + v;
    }
  }
  return totals;
}
