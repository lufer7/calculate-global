import type { Result } from '../result';
import { err, ok } from '../result';
import type { BranchId, ClassId } from './classes';
import { BRANCH_IDS, CLASSES } from './classes';
import { GAME_CONFIG } from './config';
import skillsData from './skills.json';

/** Tier 4 = Ustalık (mastery). */
export type Tier = 1 | 2 | 3 | 4;

export interface SkillDefinition {
  id: string;
  class: ClassId;
  branch: BranchId;
  tier: Tier;
  name: string;
  max_rank: number;
  /** Engine hook, e.g. "expedition.duration_reduction". */
  effect: string;
  unit: string;
  description: string;
  value_per_rank?: number;
  values_by_rank?: number[];
}

export const SKILLS: readonly SkillDefinition[] = skillsData.skills as SkillDefinition[];
export const SKILLS_BY_ID: ReadonlyMap<string, SkillDefinition> = new Map(SKILLS.map((s) => [s.id, s]));

/** Effect value at a given rank (0 when not learned). */
export function skillValue(skill: SkillDefinition, rank: number): number {
  if (rank <= 0) return 0;
  const r = Math.min(rank, skill.max_rank);
  if (skill.values_by_rank) return skill.values_by_rank[r - 1]!;
  return (skill.value_per_rank ?? 0) * r;
}

/** skillId -> rank */
export type SkillRanks = Record<string, number>;

export function rankCost(rank: number): number {
  const costs = GAME_CONFIG.skill.rank_costs;
  return costs[Math.min(rank, costs.length) - 1]!;
}

/** Total YP needed to take a skill from 0 to `rank`. */
export function costToRank(rank: number): number {
  let total = 0;
  for (let r = 1; r <= rank; r++) total += rankCost(r);
  return total;
}

/** Design doc §2: +1 per level-up, +1 bonus every 10 levels. Level 1 has 0. */
export function totalSkillPoints(level: number): number {
  const { points_per_level, bonus_point_every_levels } = GAME_CONFIG.skill;
  return (level - 1) * points_per_level + Math.floor(level / bonus_point_every_levels);
}

export function pointsSpent(ranks: SkillRanks): number {
  return Object.values(ranks).reduce((sum, r) => sum + costToRank(r), 0);
}

export function pointsSpentInBranch(ranks: SkillRanks, branch: BranchId): number {
  let sum = 0;
  for (const [id, r] of Object.entries(ranks)) if (SKILLS_BY_ID.get(id)?.branch === branch) sum += costToRank(r);
  return sum;
}

export function tierUnlocked(ranks: SkillRanks, branch: BranchId, tier: Tier): boolean {
  return pointsSpentInBranch(ranks, branch) >= GAME_CONFIG.skill.tier_unlock_points[tier - 1]!;
}

export function branchFullCost(branch: BranchId): number {
  return SKILLS.filter((s) => s.branch === branch).reduce((sum, s) => sum + costToRank(s.max_rank), 0);
}

export type RankUpError = 'unknown_skill' | 'wrong_class' | 'max_rank' | 'tier_locked' | 'not_enough_points';

export function rankUp(
  fighter: { class: ClassId; level: number; skills: SkillRanks },
  skillId: string,
): Result<SkillRanks, RankUpError> {
  const skill = SKILLS_BY_ID.get(skillId);
  if (!skill) return err('unknown_skill');
  if (skill.class !== fighter.class) return err('wrong_class');
  const current = fighter.skills[skillId] ?? 0;
  if (current >= skill.max_rank) return err('max_rank');
  if (!tierUnlocked(fighter.skills, skill.branch, skill.tier)) return err('tier_locked');
  const available = totalSkillPoints(fighter.level) - pointsSpent(fighter.skills);
  if (available < rankCost(current + 1)) return err('not_enough_points');
  return ok({ ...fighter.skills, [skillId]: current + 1 });
}

/**
 * Re-validates a whole allocation (server side, e.g. on load or after a config change).
 * Tier requirements are checked against points spent in *lower* tiers, so the order
 * in which ranks were bought cannot be abused.
 */
export function validateAllocation(fighter: { class: ClassId; level: number; skills: SkillRanks }): boolean {
  if (pointsSpent(fighter.skills) > totalSkillPoints(fighter.level)) return false;
  for (const [id, rank] of Object.entries(fighter.skills)) {
    const s = SKILLS_BY_ID.get(id);
    if (!s || s.class !== fighter.class || !Number.isInteger(rank) || rank < 0 || rank > s.max_rank) return false;
    if (rank === 0) continue;
    const lowerTierSpend = Object.entries(fighter.skills)
      .filter(([oid]) => {
        const o = SKILLS_BY_ID.get(oid);
        return o?.branch === s.branch && o.tier < s.tier;
      })
      .reduce((sum, [, r]) => sum + costToRank(r), 0);
    if (lowerTierSpend < GAME_CONFIG.skill.tier_unlock_points[s.tier - 1]!) return false;
  }
  return true;
}

/** Sanity check of skills.json against the class/branch definitions. */
export function validateSkillCatalog(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const s of SKILLS) {
    if (seen.has(s.id)) problems.push(`duplicate id ${s.id}`);
    seen.add(s.id);
    if (!CLASSES[s.class]) problems.push(`${s.id}: unknown class`);
    else if (!(BRANCH_IDS[s.class] as readonly string[]).includes(s.branch)) problems.push(`${s.id}: branch not in class`);
    if (s.values_by_rank && s.values_by_rank.length !== s.max_rank) problems.push(`${s.id}: values_by_rank length`);
    if (!s.values_by_rank && s.value_per_rank === undefined) problems.push(`${s.id}: no value`);
  }
  for (const c of Object.values(CLASSES)) {
    for (const b of BRANCH_IDS[c.id]) {
      const tiers = SKILLS.filter((s) => s.branch === b).map((s) => s.tier);
      if (tiers.filter((t) => t === 4).length !== 1) problems.push(`${b}: needs exactly one mastery`);
    }
  }
  return problems;
}

/** Respec (Unutma İksiri). Design doc §2: first one free, then potion + 24h cooldown. */
export interface RespecState {
  count: number;
  lastAt: number | null;
}

export type RespecError = 'cooldown' | 'potion_required';

export function canRespec(state: RespecState, now: number, hasPotion: boolean): Result<'free' | 'potion', RespecError> {
  if (state.count === 0 && GAME_CONFIG.skill.first_respec_free) return ok('free');
  if (state.lastAt !== null && now - state.lastAt < GAME_CONFIG.skill.respec_cooldown_hours * 3_600_000) return err('cooldown');
  return hasPotion ? ok('potion') : err('potion_required');
}
