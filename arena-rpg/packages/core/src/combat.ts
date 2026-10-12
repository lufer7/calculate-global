import type { ItemInstance, Slot } from './items';
import { gearTotals } from './items';
import { createRng, randomInt } from './random';
import type { DerivedStats, Stats } from './stats';
import { deriveStats } from './stats';

export interface CombatantSetup {
  level: number;
  stats: Stats;
  equipment: Partial<Record<Slot, Pick<ItemInstance, 'templateId' | 'upgradeLevel'>>>;
}

export type Side = 'a' | 'b';

/** Structured events only – the client turns them into localized text. No free text crosses the wire. */
export interface CombatEvent {
  round: number;
  actor: Side;
  kind: 'hit' | 'crit' | 'dodge';
  damage: number;
  targetHp: number;
}

export interface BattleResult {
  winner: Side | 'draw';
  rounds: number;
  hp: Record<Side, number>;
  maxHp: Record<Side, number>;
  log: CombatEvent[];
}

export function combatProfile(c: CombatantSetup): DerivedStats {
  return deriveStats(c.level, c.stats, gearTotals(c.equipment));
}

/**
 * Deterministic: identical (a, b, seed) always yields the identical result.
 * The server runs this for PvP; the client can replay the same seed to animate it.
 */
export function simulateBattle(a: CombatantSetup, b: CombatantSetup, seed: number, maxRounds = 25): BattleResult {
  const rng = createRng(seed);
  const prof = { a: combatProfile(a), b: combatProfile(b) };
  const hp = { a: prof.a.maxHp, b: prof.b.maxHp };
  const log: CombatEvent[] = [];
  const other = (s: Side): Side => (s === 'a' ? 'b' : 'a');

  let round = 0;
  while (round < maxRounds) {
    round += 1;
    const first: Side =
      prof.a.initiative === prof.b.initiative ? (rng() < 0.5 ? 'a' : 'b') : prof.a.initiative > prof.b.initiative ? 'a' : 'b';

    for (const actor of [first, other(first)]) {
      const target = other(actor);
      const atk = prof[actor];
      const def = prof[target];
      if (rng() < def.dodgeChance) {
        log.push({ round, actor, kind: 'dodge', damage: 0, targetHp: hp[target] });
        continue;
      }
      const crit = rng() < atk.critChance;
      const raw = randomInt(rng, atk.damageMin, atk.damageMax) * (crit ? 1.75 : 1);
      const damage = Math.max(1, Math.round(raw * (1 - def.armor / (def.armor + 60))));
      hp[target] = Math.max(0, hp[target] - damage);
      log.push({ round, actor, kind: crit ? 'crit' : 'hit', damage, targetHp: hp[target] });
      if (hp[target] === 0) {
        return { winner: actor, rounds: round, hp, maxHp: { a: prof.a.maxHp, b: prof.b.maxHp }, log };
      }
    }
  }

  const ratioA = hp.a / prof.a.maxHp;
  const ratioB = hp.b / prof.b.maxHp;
  const winner: BattleResult['winner'] = ratioA === ratioB ? 'draw' : ratioA > ratioB ? 'a' : 'b';
  return { winner, rounds: round, hp, maxHp: { a: prof.a.maxHp, b: prof.b.maxHp }, log };
}
