import { describe, expect, it } from 'vitest';
import {
  ENERGY_MAX, ENERGY_REGEN_MS, buyItem, claimQuest, createCharacter, currentEnergy, equipItem, newSave, spendEnergy, startQuest, upgradeItem,
} from '../src/index';
import { NOW, random } from './helpers';

function save() {
  const r = createCharacter({ name: 'Tester', origin: 'courier', allocation: { agility: 5, strength: 5 } }, { random, now: NOW });
  if (!r.ok) throw new Error();
  return newSave(r.value, NOW);
}

describe('energy', () => {
  it('regenerates over time and caps at max', () => {
    const spent = spendEnergy({ value: ENERGY_MAX, updatedAt: NOW }, 3, NOW)!;
    expect(spent.value).toBe(ENERGY_MAX - 3);
    expect(currentEnergy(spent, NOW + ENERGY_REGEN_MS * 2 + 5).value).toBe(ENERGY_MAX - 1);
    expect(currentEnergy(spent, NOW + ENERGY_REGEN_MS * 100).value).toBe(ENERGY_MAX);
    expect(spendEnergy({ value: 0, updatedAt: NOW }, 1, NOW)).toBeNull();
  });
});

describe('quests', () => {
  it('runs a timed quest end-to-end', () => {
    const started = startQuest(save(), 'salt_marsh_patrol', NOW, 123);
    if (!started.ok) throw new Error(started.error);
    expect(claimQuest(started.value, NOW + 1000)).toEqual({ ok: false, error: 'not_finished' });
    const claimed = claimQuest(started.value, NOW + 60_000);
    if (!claimed.ok) throw new Error(claimed.error);
    expect(claimed.value.save.activeQuest).toBeNull();
    expect(claimed.value.xp).toBeGreaterThan(0);
  });
});

describe('shop / inventory / blacksmith', () => {
  it('buys, equips and upgrades', () => {
    let s = save();
    const bought = buyItem(s, 'rusty_cleaver', random, NOW);
    if (!bought.ok) throw new Error(bought.error);
    s = bought.value;
    expect(s.gold).toBe(30);
    const uid = s.inventory[0]!.uid;
    const equipped = equipItem(s, uid, NOW);
    if (!equipped.ok) throw new Error(equipped.error);
    s = equipped.value;
    expect(s.character.equipment.weapon?.uid).toBe(uid);
    const up = upgradeItem(s, uid, NOW);
    if (!up.ok) throw new Error(up.error);
    expect(up.value.character.equipment.weapon?.upgradeLevel).toBe(1);
    expect(buyItem(s, 'ember_plume', random, NOW)).toEqual({ ok: false, error: 'unknown_item' });
  });
});
