import { createRng, game } from '@arena/core';
import type { AccountRow, FighterRow } from '../accounts/repo';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';

export interface GameClock {
  now: () => number;
  /** Development only: divides every duration (e.g. 20 = twenty times faster). */
  speed: number;
  prophecySecret: string;
}

export const skillsOf = (f: Pick<FighterRow, 'skills_json'>): game.SkillRanks => JSON.parse(f.skills_json) as game.SkillRanks;
export const researchOf = (a: Pick<AccountRow, 'research_json'>): Record<string, number> => JSON.parse(a.research_json) as Record<string, number>;

/** Day key in the server's game timezone (prophecy resets at 00:00 Europe/Istanbul). */
export function dayKey(now: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: game.GAME_CONFIG.seer.timezone }).format(now);
}

/** Highest value of a skill across the account's fighters of any status. */
export function bestSkill(fighters: FighterRow[], skillId: string): number {
  const skill = game.SKILLS_BY_ID.get(skillId)!;
  return fighters.reduce((m, f) => Math.max(m, game.skillValue(skill, skillsOf(f)[skillId] ?? 0)), 0);
}

export function addReport(db: Db, accountId: string, kind: string, title: string, body: unknown, at: number) {
  db.prepare('INSERT INTO reports (account_id, kind, title, body_json, at) VALUES (?, ?, ?, ?, ?)').run(accountId, kind, title, JSON.stringify(body), at);
}

/**
 * Lazily resolves every timer that has run out for this account (expeditions, recalls,
 * injuries, research), in time order. Called at the start of each game request, so
 * progress happens "offline" without background jobs and the device clock never matters.
 */
export function settle(db: Db, accountId: string, clock: GameClock): void {
  const now = clock.now();
  const acc = accountById(db, accountId);
  if (!acc) return;

  const due = db
    .prepare("SELECT * FROM expeditions WHERE account_id = ? AND state IN ('active', 'recalled') AND ends_at <= ? ORDER BY ends_at")
    .all(accountId, now) as unknown as ExpeditionRow[];

  for (const exp of due) {
    db.exec('BEGIN');
    try {
      if (exp.state === 'recalled') finishRecall(db, acc, exp);
      else finishExpedition(db, acc, exp, clock);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  db.prepare("UPDATE fighters SET status_kind = 'idle', status_until = NULL WHERE account_id = ? AND status_kind = 'injured' AND status_until <= ?").run(accountId, now);

  const fresh = accountById(db, accountId)!;
  if (fresh.active_research) {
    const r = JSON.parse(fresh.active_research) as { id: string; level: number; until: number };
    if (r.until <= now) {
      const levels = researchOf(fresh);
      levels[r.id] = r.level;
      db.prepare('UPDATE accounts SET research_json = ?, active_research = NULL WHERE id = ?').run(JSON.stringify(levels), accountId);
      const def = game.RESEARCH[r.id];
      addReport(db, accountId, 'research', `${game.GAME_CONFIG.research.tab_name}: ${def?.name ?? r.id} Sv ${r.level} tamamlandı`, { researchId: r.id, level: r.level }, r.until);
    }
  }
}

export interface ExpeditionRow {
  id: string;
  account_id: string;
  zone_id: string;
  fighter_ids: string;
  started_at: number;
  ends_at: number;
  base_duration_ms: number;
  seed: number;
  state: 'active' | 'recalled' | 'done';
}

function finishRecall(db: Db, acc: AccountRow, exp: ExpeditionRow) {
  const ids = JSON.parse(exp.fighter_ids) as string[];
  for (const id of ids) db.prepare("UPDATE fighters SET status_kind = 'idle', status_until = NULL WHERE id = ? AND status_kind = 'expedition'").run(id);
  db.prepare("UPDATE expeditions SET state = 'done' WHERE id = ?").run(exp.id);
  const zone = game.ZONES[exp.zone_id];
  addReport(db, acc.id, 'expedition_recalled', `${zone?.name ?? exp.zone_id}: sefer geri çağrıldı`, { zoneId: exp.zone_id, fighters: ids }, exp.ends_at);
}

function finishExpedition(db: Db, acc: AccountRow, exp: ExpeditionRow, clock: GameClock) {
  const zone = game.ZONES[exp.zone_id]!;
  const all = fightersOf(db, acc.id);
  const ids = JSON.parse(exp.fighter_ids) as string[];
  const party = all.filter((f) => ids.includes(f.id));
  const mainClass = acc.main_class as game.ClassId | null;
  const rng = createRng(exp.seed);

  const outcome = game.resolveExpedition(
    zone,
    party.map((f) => ({ id: f.id, level: f.level, skills: skillsOf(f) })),
    rng,
    {
      mainClass,
      isProphecyZone: game.prophecyZone(dayKey(exp.started_at), clock.prophecySecret) === zone.id,
      prophecyBonus: bestSkill(all, 'daily_prophecy'),
    },
  );
  const loot = game.expeditionLoot(zone.id, outcome, rng);
  const highest = Math.max(...all.map((f) => f.level));
  const perks = game.accountPerks(mainClass);
  const partyPathfinding = bestSkill(party, 'pathfinding');
  const infirmary = bestSkill(all, 'infirmary_lore');

  const fighterResults = party.map((f) => {
    const gained = Math.round(loot.xp * game.xpMultiplier(f.level, highest));
    const next = game.addXp(f, gained);
    const injured = outcome.injured.includes(f.id);
    const toughBody = game.skillValue(game.SKILLS_BY_ID.get('tough_body')!, skillsOf(f).tough_body ?? 0);
    const injuryMs = injured
      ? Math.round(game.injuryDurationMs(zone, [partyPathfinding, toughBody, infirmary, perks.injuryDurationReduction]) / clock.speed)
      : 0;
    db.prepare('UPDATE fighters SET level = ?, xp = ?, status_kind = ?, status_until = ? WHERE id = ?').run(
      next.level, next.xp, injured ? 'injured' : 'idle', injured ? exp.ends_at + injuryMs : null, f.id,
    );
    return { id: f.id, name: f.name, xp: gained, levelsGained: next.levelsGained, newLevel: next.level, injuredUntil: injured ? exp.ends_at + injuryMs : null };
  });

  db.prepare('UPDATE accounts SET gold = gold + ? WHERE id = ?').run(loot.gold, acc.id);
  db.prepare("UPDATE expeditions SET state = 'done' WHERE id = ?").run(exp.id);
  addReport(db, acc.id, 'expedition', `${zone.name} seferi döndü`, {
    zoneId: zone.id, reward: outcome.reward, extraReward: outcome.extraReward, event: outcome.event,
    gold: loot.gold, rewardMultiplier: outcome.rewardMultiplier, fighters: fighterResults, seed: exp.seed,
  }, exp.ends_at);
}
