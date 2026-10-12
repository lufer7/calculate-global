import { describe, expect, it } from 'vitest';
import { createRng, game } from '../src/index';

const { CLASS_IDS, fight, battleProfile, gearTotal, itemStats, itemName, canEquip, upgradeCost, marketStock, arenaNpcs, expeditionItems, huntingYield, regenHp, powerScore } = game;

const kit = (cls: game.ClassId, level: number) => {
  const weapon = { scout: 'bow', swordmaster: 'sword', seer: 'staff' }[cls];
  const off = { scout: 'quiver', swordmaster: 'shield', seer: 'tome' }[cls];
  const chest = { scout: 'jerkin', swordmaster: 'plate', seer: 'robe' }[cls];
  return gearTotal([weapon, off, chest, 'boots', 'gloves'].map((templateId) => ({ templateId, itemLevel: level, rarity: 'uncommon' as const, upgrade: 0 })));
};

describe('gear', () => {
  it('scales with level, rarity and upgrades', () => {
    const base = itemStats({ templateId: 'sword', itemLevel: 10, rarity: 'common', upgrade: 0 });
    const rare = itemStats({ templateId: 'sword', itemLevel: 10, rarity: 'rare', upgrade: 0 });
    const up = itemStats({ templateId: 'sword', itemLevel: 10, rarity: 'common', upgrade: 5 });
    expect(rare.damage).toBeGreaterThan(base.damage);
    expect(up.damage).toBeGreaterThan(base.damage);
    expect(itemName({ templateId: 'sword', itemLevel: 40, upgrade: 2 })).toBe('Çelik Kılıç +2');
  });
  it('enforces class, slot and level on equip', () => {
    expect(canEquip({ templateId: 'bow', itemLevel: 1 }, { class: 'seer', level: 5 }, 'main_hand')).toBe('wrong_class');
    expect(canEquip({ templateId: 'ring', itemLevel: 1 }, { class: 'seer', level: 5 }, 'ring2')).toBeNull();
    expect(canEquip({ templateId: 'helm', itemLevel: 9 }, { class: 'seer', level: 5 }, 'head')).toBe('level_too_low');
    expect(canEquip({ templateId: 'helm', itemLevel: 1 }, { class: 'seer', level: 5 }, 'feet')).toBe('wrong_slot');
    expect(upgradeCost({ templateId: 'sword', itemLevel: 10, rarity: 'common', upgrade: 0 }, 0.2)).toBeLessThan(upgradeCost({ templateId: 'sword', itemLevel: 10, rarity: 'common', upgrade: 0 }));
  });
});

describe('battle', () => {
  it('is deterministic', () => {
    const a = { name: 'A', class: 'scout' as const, level: 10, skills: {}, gear: kit('scout', 10) };
    const b = { name: 'B', class: 'seer' as const, level: 10, skills: {}, gear: kit('seer', 10) };
    expect(fight(a, b, 5)).toEqual(fight(a, b, 5));
  });

  it('keeps class match-ups roughly even at equal level and gear', () => {
    const rates: string[] = [];
    for (const x of CLASS_IDS) for (const y of CLASS_IDS) {
      if (x >= y) continue;
      let wins = 0;
      for (let s = 0; s < 400; s++) {
        const r = fight({ name: x, class: x, level: 20, skills: {}, gear: kit(x, 20) }, { name: y, class: y, level: 20, skills: {}, gear: kit(y, 20) }, s);
        if (r.winner === 'a') wins++;
      }
      rates.push(`${x}-${y}: ${(wins / 4).toFixed(0)}%`);
      expect(wins / 400, `${x} vs ${y}`).toBeGreaterThan(0.3);
      expect(wins / 400, `${x} vs ${y}`).toBeLessThan(0.7);
    }
    console.log('win rates', rates.join(', '));
  });

  it('applies skills (first strike, cheat death)', () => {
    const base = { level: 10, gear: kit('scout', 10) };
    const r = fight({ name: 'A', class: 'scout', skills: { first_strike: 1 }, ...base }, { name: 'B', class: 'scout', skills: {}, ...base }, 3);
    expect(r.log.find((e) => e.round === 1)!.actor).toBe('a');
    const tank = fight({ name: 'A', class: 'swordmaster', level: 1, skills: { resolve: 1 }, gear: kit('swordmaster', 1) }, { name: 'B', class: 'seer', level: 30, skills: {}, gear: kit('seer', 30) }, 1);
    expect(tank.log.some((e) => e.kind === 'cheat_death')).toBe(true);
  });

  it('power score grows with level', () => {
    const p = (l: number) => powerScore(battleProfile({ name: 'x', class: 'scout', level: l, skills: {}, gear: kit('scout', l) }));
    expect(p(30)).toBeGreaterThan(p(10));
  });
});

describe('economy', () => {
  it('market stock is stable within the hour and changes after', () => {
    const a = marketStock('acc', 100, 10, 'scout', 's');
    expect(a).toEqual(marketStock('acc', 100, 10, 'scout', 's'));
    expect(a).not.toEqual(marketStock('acc', 101, 10, 'scout', 's'));
    expect(a.filter((o) => o.section === 'equipment')).toHaveLength(8);
    expect(a.every((o) => o.price > 0)).toBe(true);
  });
  it('arena NPCs, loot, hunting and regen', () => {
    expect(arenaNpcs('f', 10, 1, 's')).toHaveLength(3);
    expect(expeditionItems(1, 'legendary', null, 20).some((i) => i.rarity === 'epic' || i.rarity === 'legendary')).toBe(true);
    expect(expeditionItems(1, 'nothing', null, 20)).toEqual([]);
    const y = huntingYield(3, 2 * 3_600_000, 9);
    expect(Object.values(y).reduce((a, b) => a + b, 0)).toBe(6);
    expect(regenHp(0.5, 3_600_000)).toBeCloseTo(0.6);
    expect(createRng(1)()).toBeGreaterThan(0);
  });
});
