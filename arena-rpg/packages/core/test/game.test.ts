import { describe, expect, it } from 'vitest';
import { createRng, game } from '../src/index';

const {
  BRANCH_IDS, CLASSES, GAME_CONFIG, ZONES, accountLevel, applyTimeWarp, boostedRewardWeights, branchFullCost, canRespec,
  expeditionDuration, expeditionSlots, fighterSlots, partyBonuses, planExpedition, plunderAmount, prophecyZone,
  rankUp, recallReturnTime, resolveExpedition, totalSkillPoints, validateAllocation, validateSkillCatalog, xpMultiplier,
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

describe('expeditions', () => {
  it('computes slots like the doc examples', () => {
    expect(expeditionSlots(5, 0)).toBe(3);
    expect(expeditionSlots(5, 50)).toBe(5);
    expect(expeditionSlots(0, 24)).toBe(1);
  });

  it('never goes below 40% duration', () => {
    const zone = ZONES.dark_forest!;
    const fast = partyBonuses([{ skills: { swift_steps: 5 } }]);
    expect(expeditionDuration(zone, fast)).toBe(Math.round(zone.baseDurationMs * 0.8));
    expect(expeditionDuration(zone, fast, [0.5, 0.5])).toBe(Math.round(zone.baseDurationMs * 0.4));
  });

  it('takes the max of a skill across scouts instead of summing', () => {
    const b = partyBonuses([{ skills: { treasure_hunter: 2 } }, { skills: { treasure_hunter: 4 } }]);
    expect(b.rareChanceRelative).toBeCloseTo(0.12);
  });

  it('applies relative rare boost with cap', () => {
    const base = ZONES.dark_forest!.rewardWeights;
    const boosted = boostedRewardWeights(base, 0.15);
    const share = (w: typeof base) => (w.rare + w.epic + w.legendary) / Object.values(w).reduce((a, b) => a + b, 0);
    expect(share(boosted)).toBeCloseTo(share(base) * 1.15);
    expect(share(boostedRewardWeights(base, 100))).toBeCloseTo(GAME_CONFIG.expedition.chance_cap);
  });

  it('plans with slot, busy, hidden-zone and empty-castle checks', () => {
    const scout = fighter({ id: 's', level: 30 });
    const other = fighter({ id: 'o', class: 'swordmaster', level: 30 });
    const all = [scout, other];
    const base = { party: [scout], allFighters: all, researchLevel: 0, now: 0 };
    const r = planExpedition({ ...base, zoneId: 'dark_forest', activeExpeditions: 0 });
    expect(r.ok && r.value.leavesCastleEmpty).toBe(false);
    expect(planExpedition({ ...base, zoneId: 'dark_forest', activeExpeditions: 2 })).toEqual({ ok: false, error: 'no_free_slot' });
    expect(planExpedition({ ...base, zoneId: 'lost_lands', activeExpeditions: 0 })).toEqual({ ok: false, error: 'hidden_zone' });
    const busy = fighter({ id: 's', status: { kind: 'injured', until: 10 } });
    expect(planExpedition({ ...base, party: [busy], zoneId: 'dark_forest', activeExpeditions: 0 })).toEqual({ ok: false, error: 'fighter_busy' });
  });

  it('resolves deterministically from the server seed', () => {
    const party = [{ id: 'a', level: 10, skills: { trap_sense: 5 } }];
    const a = resolveExpedition(ZONES.dark_forest!, party, createRng(99), { prophecyBonus: 0.2 });
    const b = resolveExpedition(ZONES.dark_forest!, party, createRng(99), { prophecyBonus: 0.2 });
    expect(a).toEqual(b);
    expect(a.rewardMultiplier).toBe(1.2);
  });

  it('trap sense lowers bad events over many runs', () => {
    const count = (skills: Record<string, number>) => {
      let bad = 0;
      for (let i = 0; i < 4000; i++) {
        const o = resolveExpedition(ZONES.dark_forest!, [{ id: 'a', level: 10, skills }], createRng(i));
        if (['ambush', 'trap', 'cursed_chest'].includes(o.event)) bad++;
      }
      return bad;
    };
    expect(count({ trap_sense: 5 })).toBeLessThan(count({}) * 0.85);
  });

  it('recall and time warp', () => {
    expect(recallReturnTime(1000, 4000)).toBe(7000);
    const exp = { startedAt: 0, endsAt: 1000, baseDurationMs: 1000 };
    expect(applyTimeWarp(exp, 0)).toBe(750);
    expect(applyTimeWarp({ ...exp, endsAt: 450 }, 0)).toBe(400);
  });

  it('prophecy is stable per day', () => {
    expect(prophecyZone('2026-10-12', 's')).toBe(prophecyZone('2026-10-12', 's'));
    expect(ZONES[prophecyZone('2026-10-12', 's')]!.hidden).toBeFalsy();
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
  it('scout main class speeds up and enriches every expedition of the account', () => {
    const swordsman = fighter({ id: 'x', class: 'swordmaster', level: 10 });
    const plan = (mainClass: game.ClassId | null) => {
      const r = planExpedition({ zoneId: 'dark_forest', party: [swordsman], allFighters: [swordsman], activeExpeditions: 0, researchLevel: 0, now: 0, mainClass });
      if (!r.ok) throw new Error(r.error);
      return r.value.durationMs;
    };
    expect(plan('scout')).toBe(Math.round(plan(null) * 0.8));
    expect(accountPerks('scout').expeditionRareChanceRelative).toBe(0.3);
  });
  it('swordmaster plunders more and loses less; seer gets prophecy and faster research', () => {
    expect(attackPlunder({ defenderGold: 1000, attackerMainClass: 'swordmaster' })).toBe(375);
    expect(attackPlunder({ defenderGold: 1000, defenderMainClass: 'swordmaster' })).toBe(225);
    const o = resolveExpedition(ZONES.dark_forest!, [{ id: 'a', level: 10, skills: {} }], createRng(1), { mainClass: 'seer', isProphecyZone: true });
    expect(o.rewardMultiplier).toBeCloseTo(1.1);
    expect(MAIN_CLASS_PERKS.seer.perks.researchDurationReduction).toBe(0.2);
  });
});

describe('loot, injuries and research', () => {
  it('pays nothing-tier trips only XP and scales with tier', () => {
    const base = { extraReward: null, event: 'none' as const, rewardMultiplier: 1, injured: [] };
    const none = game.expeditionLoot('dark_forest', { ...base, reward: 'nothing' }, () => 0.5);
    const epic = game.expeditionLoot('dark_forest', { ...base, reward: 'epic' }, () => 0.5);
    expect(none.gold).toBe(0);
    expect(none.xp).toBe(10);
    expect(epic.gold).toBe(180);
  });
  it('injury and research durations respect their floors', () => {
    const zone = ZONES.dark_forest!;
    expect(game.injuryDurationMs(zone, [0.9, 0.9])).toBe(Math.round(zone.baseDurationMs * 0.25));
    const def = game.RESEARCH.expedition_logistics!;
    expect(game.researchDuration(def, 1, [0.2])).toBe(Math.round(def.durationMs(1) * 0.8));
  });
});
