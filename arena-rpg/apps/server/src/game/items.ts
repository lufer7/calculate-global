import { game } from '@arena/core';
import type { Db } from '../db/database';
import { randomId } from '../lib/security';

export interface ItemRow {
  id: string;
  account_id: string;
  template_id: string;
  item_level: number;
  rarity: game.Rarity;
  upgrade: number;
  qty: number;
  fighter_id: string | null;
  slot: game.EquipSlot | null;
  created_at: number;
}

export const toInstance = (r: ItemRow): game.ItemInstance => ({ id: r.id, templateId: r.template_id, itemLevel: r.item_level, rarity: r.rarity, upgrade: r.upgrade, qty: r.qty });

export const itemsOf = (db: Db, accountId: string) =>
  db.prepare('SELECT * FROM items WHERE account_id = ? ORDER BY created_at, id').all(accountId) as unknown as ItemRow[];

export const bagCount = (db: Db, accountId: string) =>
  (db.prepare('SELECT COUNT(*) n FROM items WHERE account_id = ? AND fighter_id IS NULL').get(accountId) as { n: number }).n;

export const equippedOf = (db: Db, fighterId: string) =>
  db.prepare('SELECT * FROM items WHERE fighter_id = ?').all(fighterId) as unknown as ItemRow[];

export function fighterGear(db: Db, fighterId: string): game.GearStats {
  return game.gearTotal(equippedOf(db, fighterId).map(toInstance));
}

/** 48 slots + Büyük Heybe research. */
export function bagCapacity(db: Db, accountId: string): number {
  const row = db.prepare('SELECT research_json FROM accounts WHERE id = ?').get(accountId) as { research_json: string } | undefined;
  return game.INVENTORY_SLOTS + (row ? game.researchEffects(JSON.parse(row.research_json) as Record<string, number>).bagSlots : 0);
}

/**
 * Puts an item into the gang bag. Stackables merge into an existing stack.
 * Returns the item id, or null if the bag is full.
 */
export function addItem(db: Db, accountId: string, item: Omit<game.ItemInstance, 'id'>, now: number): string | null {
  const t = game.template(item.templateId);
  if (t?.stackable) {
    const stack = db.prepare('SELECT id FROM items WHERE account_id = ? AND template_id = ? AND fighter_id IS NULL').get(accountId, item.templateId) as { id: string } | undefined;
    if (stack) {
      db.prepare('UPDATE items SET qty = qty + ? WHERE id = ?').run(item.qty, stack.id);
      return stack.id;
    }
  }
  if (bagCount(db, accountId) >= bagCapacity(db, accountId)) return null;
  const id = randomId();
  db.prepare('INSERT INTO items (id, account_id, template_id, item_level, rarity, upgrade, qty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, accountId, item.templateId, item.itemLevel, item.rarity, item.upgrade, item.qty, now,
  );
  return id;
}

/** Removes `qty` from a stack (or the whole item). */
export function consume(db: Db, item: ItemRow, qty = 1) {
  if (item.qty > qty) db.prepare('UPDATE items SET qty = qty - ? WHERE id = ?').run(qty, item.id);
  else db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
}

export function countOf(db: Db, accountId: string, templateId: string): number {
  return (db.prepare('SELECT COALESCE(SUM(qty), 0) n FROM items WHERE account_id = ? AND template_id = ? AND fighter_id IS NULL').get(accountId, templateId) as { n: number }).n;
}

export function takeResources(db: Db, accountId: string, inputs: Record<string, number>) {
  for (const [templateId, qty] of Object.entries(inputs)) {
    const stack = db.prepare('SELECT * FROM items WHERE account_id = ? AND template_id = ? AND fighter_id IS NULL').get(accountId, templateId) as ItemRow | undefined;
    if (stack) consume(db, stack, qty);
  }
}

/** Starter kit for a new fighter: class weapon + simple armour, equipped; some bread for the gang. */
export function giveStarterKit(db: Db, accountId: string, fighterId: string, cls: game.ClassId, now: number) {
  const kit: Record<game.ClassId, [string, game.EquipSlot][]> = {
    scout: [['bow', 'main_hand'], ['hood', 'head'], ['jerkin', 'chest']],
    swordmaster: [['sword', 'main_hand'], ['helm', 'head'], ['plate', 'chest']],
    seer: [['staff', 'main_hand'], ['hood', 'head'], ['robe', 'chest']],
  };
  for (const [templateId, slot] of kit[cls]) {
    db.prepare('INSERT INTO items (id, account_id, template_id, item_level, rarity, upgrade, qty, fighter_id, slot, created_at) VALUES (?, ?, ?, 1, ?, 0, 1, ?, ?, ?)').run(
      randomId(), accountId, templateId, 'common', fighterId, slot, now,
    );
  }
  addItem(db, accountId, { templateId: 'bread', itemLevel: 1, rarity: 'common', upgrade: 0, qty: 3 }, now);
}

/** Client-facing view of an item with everything the UI needs. */
export function itemView(r: ItemRow, smithReduction = 0, sellBonus = 0) {
  const inst = toInstance(r);
  const t = game.template(r.template_id);
  return {
    id: r.id,
    templateId: r.template_id,
    kind: t?.kind ?? 'resource',
    icon: t?.icon ?? 'unknown',
    name: game.itemName(inst),
    itemLevel: r.item_level,
    rarity: r.rarity,
    upgrade: r.upgrade,
    qty: r.qty,
    slot: t?.slot ?? null,
    classes: t?.classes ?? null,
    stats: t?.kind === 'equipment' ? game.itemStats(inst) : null,
    heal: t?.heal ?? null,
    description: t?.description ?? null,
    sellPrice: Math.max(1, Math.round(game.sellPrice(inst) * (1 + sellBonus))),
    upgradeCost: t?.kind === 'equipment' && r.upgrade < game.MAX_ITEM_UPGRADE ? game.upgradeCost(inst, smithReduction) : null,
    fighterId: r.fighter_id,
    equippedSlot: r.slot,
  };
}
