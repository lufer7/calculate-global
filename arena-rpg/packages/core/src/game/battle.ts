import { createRng, randomInt } from '../random';
import type { ClassId } from './classes';
import { CLASSES } from './classes';
import { GAME_CONFIG } from './config';
import type { GearStats } from './gear';
import type { SkillRanks } from './skills';
import { SKILLS_BY_ID, skillValue } from './skills';

/** Everything the battle needs to know about one fighter. */
export interface BattlerInput {
  name: string;
  class: ClassId;
  level: number;
  skills: SkillRanks;
  gear: GearStats;
  /** 0..1 – fighters enter with their current health. */
  hpRatio?: number;
  /** Account-wide relative bonuses (Rasathane research), e.g. { damage: 0.06, armor: 0.08 }. */
  bonus?: { damage?: number; armor?: number };
}

export interface BattleProfile {
  maxHp: number;
  hp: number;
  damageMin: number;
  damageMax: number;
  /** Seers hit with spells: armour only blocks part of it. */
  magical: boolean;
  armor: number;
  crit: number;
  critMult: number;
  evasion: number;
  accuracy: number;
  speed: number;
  /** Share of the target's armour ignored (class trait + Zırh Delici). */
  pierce: number;
}

const sv = (skills: SkillRanks, id: string) => skillValue(SKILLS_BY_ID.get(id)!, skills[id] ?? 0);

/** Combat numbers from level, class, gear and combat skills. Original formulas – tune freely. */
export function battleProfile(b: BattlerInput): BattleProfile {
  const m = CLASSES[b.class].baseModifiers;
  const s = b.skills;
  const g = b.gear;
  const magical = b.class === 'seer';
  const baseDamage = (6 + b.level * 2.2 + g.damage + (magical ? g.magic * 0.8 : 0)) * m.damage * (1 + sv(s, 'heavy_blow')) * (magical ? m.magic * (1 + sv(s, 'fireball')) : 1) * (1 + (b.bonus?.damage ?? 0));
  const maxHp = Math.round((80 + b.level * 14 + g.hp) * m.hp);
  const { evasion_cap, crit_chance_cap } = GAME_CONFIG.combat;
  return {
    maxHp,
    hp: Math.max(1, Math.round(maxHp * (b.hpRatio ?? 1))),
    damageMin: Math.max(1, Math.round(baseDamage * 0.8)),
    damageMax: Math.max(2, Math.round(baseDamage * 1.2)),
    magical,
    armor: Math.round((b.level * 1.2 + g.armor) * m.armor * (1 + sv(s, 'iron_skin')) * (1 + (b.bonus?.armor ?? 0))),
    crit: Math.min(crit_chance_cap, m.crit + g.crit + sv(s, 'keen_eye')),
    critMult: 1.6 + sv(s, 'deadly_aim'),
    evasion: Math.min(evasion_cap, m.evasion + g.evasion + sv(s, 'agility')),
    accuracy: Math.min(0.99, 0.9 + g.accuracy + sv(s, 'weapon_mastery')),
    speed: Math.round((10 + b.level * 0.3 + g.speed) * m.speed),
    pierce: Math.min(0.6, m.pierce + sv(s, 'armor_piercer')),
  };
}

/** Rough single number for matchmaking and UI ("Güç"). */
export function powerScore(p: BattleProfile): number {
  const dps = ((p.damageMin + p.damageMax) / 2) * (1 + p.crit * (p.critMult - 1)) * p.accuracy;
  const ehp = p.maxHp * (1 + p.armor / 100) / (1 - p.evasion);
  return Math.round(Math.sqrt(dps * ehp) * (1 + p.speed / 200));
}

export type Side = 'a' | 'b';
export type BattleEventKind = 'hit' | 'crit' | 'miss' | 'dodge' | 'heal' | 'double' | 'cheat_death' | 'flee' | 'curse';

export interface BattleEvent {
  round: number;
  actor: Side;
  kind: BattleEventKind;
  value: number;
  hp: Record<Side, number>;
}

export interface BattleOutcome {
  winner: Side | 'draw';
  fled: Side | null;
  rounds: number;
  maxHp: Record<Side, number>;
  startHp: Record<Side, number>;
  hp: Record<Side, number>;
  log: BattleEvent[];
}

/**
 * Deterministic 1v1 battle. Same inputs + seed → same result, so the server decides
 * and the app can replay the log as an animation.
 */
export function fight(a: BattlerInput, b: BattlerInput, seed: number, opts: { night?: boolean; maxRounds?: number } = {}): BattleOutcome {
  const rng = createRng(seed);
  const P = { a: battleProfile(a), b: battleProfile(b) };
  const S = { a: a.skills, b: b.skills };
  const hp = { a: P.a.hp, b: P.b.hp };
  const startHp = { ...hp };
  const log: BattleEvent[] = [];
  const other = (x: Side): Side => (x === 'a' ? 'b' : 'a');
  const push = (round: number, actor: Side, kind: BattleEventKind, value: number) => log.push({ round, actor, kind, value, hp: { ...hp } });

  // Pre-battle curses / buffs
  const dmgMult = { a: 1 + sv(S.a, 'war_cries') + sv(S.a, 'blessing'), b: 1 + sv(S.b, 'war_cries') + sv(S.b, 'blessing') };
  const armorMult = { a: 1, b: 1 };
  const accuracyDebuff: Record<Side, { turns: number }> = { a: { turns: 0 }, b: { turns: 0 } };
  for (const side of ['a', 'b'] as const) {
    const foe = other(side);
    const weaken = sv(S[side], 'curse_of_weakness');
    if (weaken) dmgMult[foe] *= 1 - weaken;
    if ((S[side].black_moon ?? 0) > 0) armorMult[foe] = 0.8;
    const blind = sv(S[side], 'blind_star');
    if (blind) accuracyDebuff[foe].turns = blind;
    if (weaken || blind || armorMult[foe] < 1) push(0, side, 'curse', 0);
    if (opts.night) dmgMult[side] *= 1 + sv(S[side], 'night_power');
  }
  const cheatDeathLeft = { a: (S.a.resolve ?? 0) > 0, b: (S.b.resolve ?? 0) > 0 };
  const attackerLevel = { a: a.level, b: b.level };
  const guaranteedCrit = { a: false, b: false };
  const maxRounds = opts.maxRounds ?? 30;

  const firstSide = (): Side => {
    const fa = (S.a.first_strike ?? 0) > 0;
    const fb = (S.b.first_strike ?? 0) > 0;
    if (fa !== fb) return fa ? 'a' : 'b';
    if (P.a.speed !== P.b.speed) return P.a.speed > P.b.speed ? 'a' : 'b';
    return rng() < 0.5 ? 'a' : 'b';
  };

  const attack = (round: number, att: Side, extra = false): boolean => {
    const def = other(att);
    const A = P[att];
    const D = P[def];
    const accuracy = A.accuracy - (accuracyDebuff[att].turns >= round ? 0.1 : 0);
    if (rng() > accuracy) {
      push(round, att, 'miss', 0);
      return false;
    }
    if (rng() < D.evasion) {
      push(round, att, 'dodge', 0);
      if ((S[def].hunters_patience ?? 0) > 0) guaranteedCrit[def] = true;
      return false;
    }
    const crit = guaranteedCrit[att] || rng() < A.crit;
    guaranteedCrit[att] = false;
    let dmg = randomInt(rng, A.damageMin, A.damageMax) * dmgMult[att] * (crit ? A.critMult : 1);
    if (hp[att] / A.maxHp < 0.5) dmg *= 1 + sv(S[att], 'rage');
    const armor = D.armor * armorMult[def] * (1 - A.pierce) * (A.magical ? 0.6 : 1);
    // Armour mitigation scales with the attacker's level so it never becomes immunity.
    dmg = Math.max(1, Math.round(dmg * (1 - armor / (armor + 40 + attackerLevel[att] * 8))));
    hp[def] = Math.max(0, hp[def] - dmg);
    if (hp[def] === 0 && cheatDeathLeft[def]) {
      cheatDeathLeft[def] = false;
      hp[def] = 1;
      push(round, def, 'cheat_death', 0);
    }
    push(round, att, extra ? 'double' : crit ? 'crit' : 'hit', dmg);
    const lifesteal = sv(S[att], 'blood_bond');
    if (lifesteal && A.magical) hp[att] = Math.min(A.maxHp, hp[att] + Math.round(dmg * lifesteal));
    return hp[def] === 0;
  };

  let round = 0;
  while (round < maxRounds) {
    round++;
    const first = firstSide();
    for (const side of [first, other(first)]) {
      // Healer: every 3rd round heal self (in 1v1 the fighter is the lowest ally).
      if (round % 3 === 0) {
        const heal = sv(S[side], 'healer');
        if (heal && hp[side] > 0) {
          const amount = Math.round(P[side].maxHp * heal);
          hp[side] = Math.min(P[side].maxHp, hp[side] + amount);
          push(round, side, 'heal', amount);
        }
      }
      // Scout "Gölgeye Karış": may slip away when nearly beaten (counts as a loss, but keeps more health).
      const flee = sv(S[side], 'blend_into_shadow');
      if (flee && hp[side] > 0 && hp[side] / P[side].maxHp < GAME_CONFIG.combat.flee_hp_threshold && rng() < flee) {
        push(round, side, 'flee', 0);
        return { winner: other(side), fled: side, rounds: round, maxHp: { a: P.a.maxHp, b: P.b.maxHp }, startHp, hp, log };
      }
      if (attack(round, side)) return done(side);
      if (rng() < sv(S[side], 'double_shot') && attack(round, side, true)) return done(side);
    }
  }
  const ra = hp.a / P.a.maxHp;
  const rb = hp.b / P.b.maxHp;
  return { winner: ra === rb ? 'draw' : ra > rb ? 'a' : 'b', fled: null, rounds: round, maxHp: { a: P.a.maxHp, b: P.b.maxHp }, startHp, hp, log };

  function done(winner: Side): BattleOutcome {
    return { winner, fled: null, rounds: round, maxHp: { a: P.a.maxHp, b: P.b.maxHp }, startHp, hp, log };
  }
}
