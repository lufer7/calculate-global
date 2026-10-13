import { describe, expect, it } from 'vitest';
import { createRng, game } from '../src/index';

const { CLASS_IDS, fight, battleProfile, gearTotal, itemStats, itemName, canEquip, upgradeCost, marketStock, arenaNpcs, huntingYield, regenHp, powerScore } = game;

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
    const y = huntingYield(3, 2 * 3_600_000, 9);
    expect(Object.values(y).reduce((a, b) => a + b, 0)).toBe(6);
    expect(regenHp(0.5, 3_600_000)).toBeCloseTo(0.54);
    expect(regenHp(0.5, 3_600_000, game.CAMI_HEAL_PER_HOUR)).toBeCloseTo(0.7);
    expect(game.restTimeToFull(0.6)).toBe(2 * 3_600_000);
    expect(createRng(1)()).toBeGreaterThan(0);
  });
});

describe('sefer creatures', () => {
  it('five creatures per zone, getting stronger', () => {
    for (const z of Object.keys(game.ZONES)) {
      const list = game.creaturesOf(z);
      expect(list).toHaveLength(5);
      expect([...list].sort((a, b) => a.level - b.level)).toEqual(list);
    }
  });
  it('an even fighter usually beats the creatures of its level, a weak one does not', () => {
    const wins = (lvl: number, cr: game.Creature) => {
      let w = 0;
      for (let seed = 1; seed <= 200; seed++) if (game.huntCreature({ fighter: { name: 'f', class: 'swordmaster', level: lvl, skills: {}, gear: kit('swordmaster', lvl) }, creature: cr, seed }).won) w++;
      return w / 200;
    };
    const wolf = game.CREATURES_BY_ID.get('grey_wolf')!;
    expect(wins(6, wolf)).toBeGreaterThan(0.6);
    expect(wins(1, game.CREATURES_BY_ID.get('old_bear')!)).toBeLessThan(0.2);
  });
  it('pays gold and xp on a win, xp only on a loss, deterministic per seed', () => {
    const f = { name: 'f', class: 'swordmaster' as const, level: 10, skills: {}, gear: kit('swordmaster', 10) };
    const fox = game.CREATURES_BY_ID.get('red_fox')!;
    const r = game.huntCreature({ fighter: f, creature: fox, seed: 5 });
    expect(r).toEqual(game.huntCreature({ fighter: f, creature: fox, seed: 5 }));
    expect(r.won).toBe(true);
    expect(r.gold).toBeGreaterThan(0);
    const lost = game.huntCreature({ fighter: { ...f, level: 1, gear: game.ZERO_STATS }, creature: game.CREATURES_BY_ID.get('realm_drake')!, seed: 5 });
    expect(lost.won).toBe(false);
    expect(lost.gold).toBe(0);
    expect(lost.hpRatio).toBeGreaterThanOrEqual(0.02);
  });
});

describe('energy', () => {
  it('regenerates 1 point per 7 minutes up to 20', () => {
    const e = { energy: 0, at: 0 };
    expect(game.currentEnergy(e, 7 * 60_000)).toBeCloseTo(1);
    expect(game.currentEnergy(e, 1e9)).toBe(20);
    expect(game.currentEnergy(e, 7 * 60_000, 20, 7 * 60_000, 20)).toBe(20);
    expect(game.nextEnergyIn({ energy: 3.5, at: 0 }, 0)).toBe(210_000);
    expect(game.explorationEnergyCost(3_600_000)).toBe(1);
    expect(game.explorationEnergyCost(8 * 3_600_000)).toBe(6);
  });
});

describe('rasathane tree', () => {
  it('needs prerequisites and sums effects', () => {
    expect(game.canResearch({}, 'stamina')).toBe('research_locked');
    expect(game.canResearch({ iron_drill: 2 }, 'stamina')).toBeNull();
    expect(game.canResearch({ cartography: 2 }, 'cartography')).toBe('max_level');
    const fx = game.researchEffects({ iron_drill: 2, stamina: 3, old_research: 4 });
    expect(fx.damage).toBeCloseTo(0.06);
    expect(fx.energyMax).toBe(6);
    expect(Object.keys(game.RESEARCH).length).toBeGreaterThanOrEqual(16);
    for (const d of Object.values(game.RESEARCH)) if (d.requires) expect(game.RESEARCH[d.requires.id], d.id).toBeTruthy();
  });
  it('research bonuses make fighters hit harder', () => {
    const base = { name: 'f', class: 'swordmaster' as const, level: 10, skills: {}, gear: kit('swordmaster', 10) };
    expect(battleProfile({ ...base, bonus: { damage: 0.15, armor: 0.2 } }).damageMax).toBeGreaterThan(battleProfile(base).damageMax);
  });
});

describe('arena plunder', () => {
  it('steals ~30%, less with Gizli Kasa, nothing while shielded', () => {
    expect(game.arenaPlunder({ defenderGold: 1000 })).toBe(300);
    expect(game.arenaPlunder({ defenderGold: 1000, defenderReduction: 0.4 })).toBe(180);
    expect(game.arenaPlunder({ defenderGold: 1000, shielded: true })).toBe(0);
    let drops = 0;
    for (let i = 0; i < 1000; i++) if (game.arenaLoot(createRng(i), 10)) drops++;
    expect(drops).toBeGreaterThan(130);
    expect(drops).toBeLessThan(270);
  });
});
