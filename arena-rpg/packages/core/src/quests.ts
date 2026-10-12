import type { BattleResult } from './combat';
import { simulateBattle } from './combat';
import { generateOpponent } from './enemies';
import { spendEnergy } from './energy';
import { gainXp } from './character';
import { createRng, randomInt } from './random';
import type { Result } from './result';
import { err, ok } from './result';
import type { SaveGame } from './save';

export interface QuestDefinition {
  id: string;
  minLevel: number;
  energyCost: number;
  durationMs: number;
  levelOffset: number;
  xp: number;
  gold: [number, number];
}

/** Original quest ids; descriptive text lives in client i18n. */
export const QUESTS: Record<string, QuestDefinition> = {
  salt_marsh_patrol: { id: 'salt_marsh_patrol', minLevel: 1, energyCost: 1, durationMs: 60_000, levelOffset: -1, xp: 12, gold: [5, 12] },
  collapsed_cistern: { id: 'collapsed_cistern', minLevel: 3, energyCost: 2, durationMs: 5 * 60_000, levelOffset: 0, xp: 30, gold: [15, 30] },
  bellfounders_yard: { id: 'bellfounders_yard', minLevel: 6, energyCost: 3, durationMs: 15 * 60_000, levelOffset: 1, xp: 70, gold: [40, 75] },
};

export type QuestError = 'unknown_quest' | 'level_too_low' | 'busy' | 'no_energy' | 'no_active_quest' | 'not_finished';

export function startQuest(save: SaveGame, questId: string, now: number, seed: number): Result<SaveGame, QuestError> {
  const q = Object.prototype.hasOwnProperty.call(QUESTS, questId) ? QUESTS[questId] : undefined;
  if (!q) return err('unknown_quest');
  if (save.character.level < q.minLevel) return err('level_too_low');
  if (save.activeQuest) return err('busy');
  const energy = spendEnergy(save.energy, q.energyCost, now);
  if (!energy) return err('no_energy');
  return ok({ ...save, energy, activeQuest: { questId, startedAt: now, endsAt: now + q.durationMs, seed: seed >>> 0 }, updatedAt: now });
}

export function claimQuest(save: SaveGame, now: number): Result<{ save: SaveGame; battle: BattleResult; gold: number; xp: number }, QuestError> {
  const active = save.activeQuest;
  if (!active) return err('no_active_quest');
  if (now < active.endsAt) return err('not_finished');
  const q = QUESTS[active.questId];
  if (!q) return err('unknown_quest');

  const enemyLevel = Math.max(1, save.character.level + q.levelOffset);
  const battle = simulateBattle(save.character, generateOpponent(enemyLevel, active.seed), active.seed);
  const won = battle.winner === 'a';
  const gold = won ? randomInt(createRng(active.seed ^ 0x9e3779b9), q.gold[0], q.gold[1]) : 0;
  const xp = won ? q.xp : Math.floor(q.xp / 4);
  return ok({
    save: { ...save, gold: save.gold + gold, character: gainXp(save.character, xp), activeQuest: null, updatedAt: now },
    battle,
    gold,
    xp,
  });
}
