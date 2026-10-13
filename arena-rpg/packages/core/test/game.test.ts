import { describe, expect, it } from 'vitest';
import { createRng, game } from '../src/index';

const {
  BRANCH_IDS, CLASSES, GAME_CONFIG, ZONES, accountLevel, branchFullCost, canRespec,
  fighterSlots, plunderAmount, prophecyZone,
  rankUp, totalSkillPoints, validateAllocation, validateSkillCatalog, xpMultiplier,
} = game;

type Fighter = game.Fighter;
const fighter = (over: Partial<Fighter>): Fighter => ({
  id: 'f1', name: 'Test', class: 'scout', level: 1, xp: 0, hpRatio: 1, skills: {}, status: { kind: 'idle' }, ...over,
});

describe('skill catalog', () => {
  it('has no structural problems', () => {
    expect(validateSkillCatalog()).toEqual([]);
  });
  it('has 3 classes x 3 branches x 6 skills', () => {
    expect(Object.keys(CLASSES)).toHaveLength(3);
    for (const c of Object.values(CLASSES)) expect(BRANCH_IDS[c.id]).toHaveLength(3);
    expect(game.SKILLS).toHaveLength(54);
  });
});

describe('skill points', () => {
  it('follows +1 per level and +1 every 10 levels', () => {
    expect(totalSkillPoints(1)).toBe(0);
    expect(totalSkillPoints(10)).toBe(10);
    expect(totalSkillPoints(100)).toBe(109);
  });

  it('enforces class, tier lock, rank cap and budget', () => {
    const f = fighter({ level: 4 });
    expect(rankUp(f, 'heavy_blow')).toEqual({ ok: false, error: 'wrong_class' });
    expect(rankUp(f, 'trap_sense')).toEqual({ ok: false, error: 'tier_locked' });
    let skills = f.skills;
    for (let i = 0; i < 2; i++) {
      const r = rankUp({ ...f, skills }, 'swift_steps');
      if (!r.ok) throw new Error(r.error);
      skills = r.value;
    }
    expect(rankUp({ ...f, skills }, 'swift_steps')).toEqual({ ok: false, error: 'not_enough_points' });
    expect(validateAllocation({ ...f, skills })).toBe(true);
    expect(validateAllocation({ ...f, skills: { swift_steps: 5 } })).toBe(false);
    expect(validateAllocation({ ...f, level: 30, skills: { explorer_spirit: 1 } })).toBe(false);
  });

  it('respec: first free, then potion + 24h cooldown', () => {
    expect(canRespec({ count: 0, lastAt: null }, 0, false)).toEqual({ ok: true, value: 'free' });
    expect(canRespec({ count: 1, lastAt: 0 }, 3_600_000, true)).toEqual({ ok: false, error: 'cooldown' });
    expect(canRespec({ count: 1, lastAt: 0 }, 25 * 3_600_000, false)).toEqual({ ok: false, error: 'potion_required' });
    expect(canRespec({ count: 1, lastAt: 0 }, 25 * 3_600_000, true)).toEqual({ ok: true, value: 'potion' });
  });
});

describe('fighters', () => {
  it('unlocks fighter slots at 1/10/25/45/70', () => {
    expect([1, 9, 10, 25, 44, 45, 70, 100].map(fighterSlots)).toEqual([1, 1, 2, 3, 3, 4, 5, 5]);
    expect(accountLevel([{ level: 12 }, { level: 40 }])).toBe(40);
  });
  it('gives catch-up XP to lagging fighters only', () => {
    expect(xpMultiplier(1, 40)).toBe(1.5);
    expect(xpMultiplier(36, 40)).toBe(1);
  });
});

describe('keşif slots and scout skills', () => {
  it('gives one slot plus one per 25 scout levels', () => {
    expect(game.explorationSlots(0)).toBe(1);
    expect(game.explorationSlots(50)).toBe(3);
  });

  it('takes the max of a skill across scouts instead of summing', () => {
    const b = game.explorationBonuses([{ skills: { treasure_hunter: 2 } }, { skills: { treasure_hunter: 4 } }]);
    expect(b.rareRelative).toBeCloseTo(0.12);
  });

  it('trap sense lowers keşif injuries over many runs', () => {
    const count = (skills: Record<string, number>) => {
      let hurt = 0;
      for (let seed = 0; seed < 4000; seed++) hurt += game.resolveExploration({ seed, travelMs: 1_800_000, exploreMs: 0, party: [{ id: 'a', level: 10, skills }] }).injured.length;
      return hurt;
    };
    expect(count({ trap_sense: 5 })).toBeLessThan(count({}) * 0.85);
  });

  it('prophecy is stable per day', () => {
    expect(prophecyZone('2026-10-12', 's')).toBe(prophecyZone('2026-10-12', 's'));
    expect(ZONES[prophecyZone('2026-10-12', 's')]).toBeTruthy();
  });
});

describe('pvp rules', () => {
  it('never plunders the protected 25%', () => {
    expect(plunderAmount(1000)).toBe(300);
    expect(plunderAmount(1000, 10)).toBe(750);
  });
});

describe('balance (design doc §2)', () => {
  const points = totalSkillPoints(100);
  it('every mastery is reachable by investing in its own branch', () => {
    for (const s of game.SKILLS.filter((x) => x.tier === 4)) {
      const before = game.SKILLS.filter((x) => x.branch === s.branch && x.tier < 4).reduce((sum, x) => sum + game.costToRank(x.max_rank), 0);
      expect(before, s.branch).toBeGreaterThanOrEqual(GAME_CONFIG.skill.tier_unlock_points[3]!);
    }
  });
  it('at level 100 two branches fit, three never do', () => {
    for (const c of Object.values(CLASSES)) {
      const costs = BRANCH_IDS[c.id].map((b) => branchFullCost(b)).sort((a, b) => b - a);
      expect(costs[0]! + costs[1]!, c.id).toBeLessThanOrEqual(points);
      expect(costs[0]! + costs[1]! + costs[2]!, c.id).toBeGreaterThan(points);
    }
  });
});

describe('main-class perks', () => {
  const { MAIN_CLASS_PERKS, accountPerks, attackPlunder } = game;
  it('scout main class speeds up and enriches every keşif', () => {
    expect(accountPerks('scout').explorationRareRelative).toBe(0.3);
    const run = (mainClass: game.ClassId | null) => game.resolveExploration({ seed: 7, travelMs: 3_600_000, exploreMs: 6 * 3_600_000, party: [{ id: 'x', level: 10, skills: {} }], mainClass });
    expect(run('scout').gold).toBeGreaterThan(run(null).gold);
  });
  it('swordmaster plunders more and loses less; seer gets prophecy and faster research', () => {
    expect(attackPlunder({ defenderGold: 1000, attackerMainClass: 'swordmaster' })).toBe(375);
    expect(attackPlunder({ defenderGold: 1000, defenderMainClass: 'swordmaster' })).toBe(225);
    expect(MAIN_CLASS_PERKS.seer.perks.prophecyBaseBonus).toBe(0.1);
    expect(MAIN_CLASS_PERKS.seer.perks.researchDurationReduction).toBe(0.2);
  });
});

describe('loot, injuries and research', () => {
  it('injury and research durations respect their floors', () => {
    const def = game.RESEARCH.iron_drill!;
    expect(game.researchDuration(def, 1, [0.2])).toBe(Math.round(def.durationMs(1) * 0.8));
  });
});

describe('keşif', () => {
  const H = 3_600_000;
  it('allows a 1 hour round trip at minimum, in 15 minute steps', () => {
    expect(game.validTimes(H / 2, 0)).toBe(true);
    expect(game.explorationTotalMs(H / 2, 0)).toBe(H);
    expect(game.validTimes(H / 4, 0)).toBe(false);
    expect(game.validTimes(H / 2, 10 * 60_000)).toBe(false);
    expect(game.validTimes(7 * H, 0)).toBe(false);
  });
  it('pays more for longer trips but barely improves the odds of a valuable find', () => {
    const party = [{ id: 'a', level: 20, skills: {} }];
    let shortGold = 0;
    let longGold = 0;
    for (let seed = 1; seed <= 200; seed++) {
      shortGold += game.resolveExploration({ seed, travelMs: H / 2, exploreMs: 0, party }).gold;
      longGold += game.resolveExploration({ seed, travelMs: H / 2, exploreMs: 9 * H, party }).gold;
    }
    expect(longGold).toBeGreaterThan(shortGold * 5);
    const share = (w: Record<string, number>) => (w.epic! + w.legendary!) / Object.values(w).reduce((a, b) => a + b, 0);
    const near = share(game.explorationRarityWeights({ rareRelative: 0, lostLands: false }, H / 2));
    const far = share(game.explorationRarityWeights({ rareRelative: 0, lostLands: false }, 6 * H));
    expect(far / near).toBeLessThan(1.15);
    expect(game.findCount(12 * H, 1)).toBe(game.EXPLORATION.maxFinds);
  });
  it('drops no common equipment (better than expeditions) and is deterministic', () => {
    const party = [{ id: 'a', level: 20, skills: {} }];
    const a = game.resolveExploration({ seed: 42, travelMs: H, exploreMs: 8 * H, party });
    expect(game.resolveExploration({ seed: 42, travelMs: H, exploreMs: 8 * H, party })).toEqual(a);
    for (let seed = 1; seed <= 100; seed++) {
      for (const f of game.resolveExploration({ seed, travelMs: H, exploreMs: 8 * H, party }).finds) {
        for (const it of f.items) if (f.kind === 'equipment') expect(it.rarity).not.toBe('common');
      }
    }
  });
});
