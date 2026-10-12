import type { RandomBytes } from './random';
import type { Result } from './result';
import { err, ok } from './result';
import type { SaveGame } from './save';
import { MAX_UPGRADE, createItem, getTemplate, upgradeCost } from './items';

export const INVENTORY_LIMIT = 40;

export type EconomyError = 'unknown_item' | 'not_enough_gold' | 'inventory_full' | 'level_too_low' | 'not_owned' | 'max_upgrade';

export function buyItem(save: SaveGame, templateId: string, random: RandomBytes, now: number): Result<SaveGame, EconomyError> {
  const t = getTemplate(templateId);
  if (!t || t.cosmetic) return err('unknown_item');
  if (save.gold < t.price) return err('not_enough_gold');
  if (save.inventory.length >= INVENTORY_LIMIT) return err('inventory_full');
  return ok({ ...save, gold: save.gold - t.price, inventory: [...save.inventory, createItem(t.id, random)], updatedAt: now });
}

export function sellItem(save: SaveGame, uid: string, now: number): Result<SaveGame, EconomyError> {
  const item = save.inventory.find((i) => i.uid === uid);
  const t = item && getTemplate(item.templateId);
  if (!item || !t) return err('not_owned');
  return ok({ ...save, gold: save.gold + Math.floor(t.price / 3), inventory: save.inventory.filter((i) => i.uid !== uid), updatedAt: now });
}

/** Moves an inventory item into its slot; whatever was equipped goes back to the inventory. */
export function equipItem(save: SaveGame, uid: string, now: number): Result<SaveGame, EconomyError> {
  const item = save.inventory.find((i) => i.uid === uid);
  const t = item && getTemplate(item.templateId);
  if (!item || !t) return err('not_owned');
  if (save.character.level < t.requiredLevel) return err('level_too_low');
  const previous = save.character.equipment[t.slot];
  const inventory = save.inventory.filter((i) => i.uid !== uid);
  if (previous) inventory.push(previous);
  return ok({
    ...save,
    inventory,
    character: { ...save.character, equipment: { ...save.character.equipment, [t.slot]: item } },
    updatedAt: now,
  });
}

/** Blacksmith upgrade of an equipped or carried item. */
export function upgradeItem(save: SaveGame, uid: string, now: number): Result<SaveGame, EconomyError> {
  const inInventory = save.inventory.find((i) => i.uid === uid);
  const equippedEntry = Object.entries(save.character.equipment).find(([, i]) => i?.uid === uid);
  const item = inInventory ?? equippedEntry?.[1];
  if (!item) return err('not_owned');
  if (item.upgradeLevel >= MAX_UPGRADE) return err('max_upgrade');
  const cost = upgradeCost(item);
  if (save.gold < cost) return err('not_enough_gold');
  const upgraded = { ...item, upgradeLevel: item.upgradeLevel + 1 };
  return ok({
    ...save,
    gold: save.gold - cost,
    inventory: save.inventory.map((i) => (i.uid === uid ? upgraded : i)),
    character: equippedEntry
      ? { ...save.character, equipment: { ...save.character.equipment, [equippedEntry[0]]: upgraded } }
      : save.character,
    updatedAt: now,
  });
}
