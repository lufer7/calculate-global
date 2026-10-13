import { game } from '@arena/core';
import type { AccountRow, FighterRow } from '../accounts/repo';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';
import { clanById, membershipOf } from '../clan/membership';
import { addItem } from './items';
import { energyOf } from './energy';

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

  const trips = db
    .prepare("SELECT * FROM explorations WHERE account_id = ? AND state IN ('active', 'recalled') AND ends_at <= ? ORDER BY ends_at")
    .all(accountId, now) as unknown as ExplorationRow[];
  for (const t of trips) {
    db.exec('BEGIN');
    try {
      finishExploration(db, acc, t, clock);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  db.prepare("UPDATE fighters SET status_kind = 'idle', status_until = NULL WHERE account_id = ? AND status_kind = 'injured' AND status_until <= ?").run(accountId, now);

  // Health regenerates slowly while idle and much faster while resting in the Cami.
  const fx = game.researchEffects(researchOf(acc));
  const restRate = game.CAMI_HEAL_PER_HOUR * (1 + fx.restHeal);
  for (const f of fightersOf(db, accountId)) {
    if (f.hp_at === null) {
      db.prepare('UPDATE fighters SET hp_at = ? WHERE id = ?').run(now, f.id);
    } else if (f.status_kind === 'resting') {
      const done = f.status_until !== null && f.status_until <= now;
      const until = done ? f.status_until! : now;
      const hp = done ? 1 : game.regenHp(f.hp_ratio, (until - f.hp_at) * clock.speed, restRate);
      if (done) {
        db.prepare('UPDATE fighters SET energy = ?, energy_at = ? WHERE id = ?').run(energyOf(f, fx, clock, until), until, f.id);
        db.prepare("UPDATE fighters SET status_kind = 'idle', status_until = NULL, hp_ratio = 1, hp_at = ? WHERE id = ?").run(now, f.id);
      } else {
        db.prepare('UPDATE fighters SET hp_ratio = ?, hp_at = ? WHERE id = ?').run(hp, now, f.id);
      }
    } else if (f.status_kind !== 'injured' && f.hp_ratio < 1) {
      db.prepare('UPDATE fighters SET hp_ratio = ?, hp_at = ? WHERE id = ?').run(game.regenHp(f.hp_ratio, (now - f.hp_at) * clock.speed), now, f.id);
    } else {
      db.prepare('UPDATE fighters SET hp_at = ? WHERE id = ?').run(now, f.id);
    }
  }

  // Scout "Avcılık": passive resources into the gang bag; production pauses when the bag is full.
  for (const f of fightersOf(db, accountId)) {
    const rank = skillsOf(f).hunting ?? 0;
    if (f.class !== 'scout' || rank === 0) continue;
    if (f.hunt_at === null) {
      db.prepare('UPDATE fighters SET hunt_at = ? WHERE id = ?').run(now, f.id);
      continue;
    }
    const elapsed = (now - f.hunt_at) * clock.speed;
    const perUnit = 3_600_000 / rank;
    const units = Math.floor(elapsed / perUnit);
    if (units <= 0) continue;
    const yieldBy = game.huntingYield(rank, units * perUnit, game.seedFrom(f.id, f.hunt_at));
    for (const [templateId, qty] of Object.entries(yieldBy)) addItem(db, accountId, { templateId, itemLevel: 1, rarity: 'common', upgrade: 0, qty }, now);
    db.prepare('UPDATE fighters SET hunt_at = ? WHERE id = ?').run(f.hunt_at + Math.round((units * perUnit) / clock.speed), f.id);
  }

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

export interface ExplorationRow {
  id: string;
  account_id: string;
  fighter_ids: string;
  started_at: number;
  travel_ms: number;
  explore_ms: number;
  base_travel_ms: number;
  base_explore_ms: number;
  ends_at: number;
  seed: number;
  state: 'active' | 'recalled' | 'done';
  luck: number;
}

/** Banner level bonus on expedition / keşif gold. */
export function clanBonus(db: Db, accountId: string): number {
  const m = membershipOf(db, accountId);
  const clan = m ? clanById(db, m.clan_id) : undefined;
  return clan ? game.clanGoldBonus(game.clanLevel(clan.xp)) : 0;
}

function finishExploration(db: Db, acc: AccountRow, t: ExplorationRow, clock: GameClock) {
  const ids = JSON.parse(t.fighter_ids) as string[];
  const all = fightersOf(db, acc.id);
  const party = all.filter((f) => ids.includes(f.id));
  db.prepare("UPDATE explorations SET state = 'done' WHERE id = ?").run(t.id);
  if (t.state === 'recalled' || party.length === 0) {
    for (const f of party) db.prepare("UPDATE fighters SET status_kind = 'idle', status_until = NULL WHERE id = ? AND status_kind = 'exploration'").run(f.id);
    addReport(db, acc.id, 'exploration_recalled', 'Keşif yarıda bırakıldı', { fighters: party.map((f) => f.name) }, t.ends_at);
    return;
  }
  const mainClass = acc.main_class as game.ClassId | null;
  const coreParty = party.map((f) => ({ id: f.id, level: f.level, skills: skillsOf(f) }));
  const o = game.resolveExploration({ seed: t.seed, travelMs: t.base_travel_ms, exploreMs: t.base_explore_ms, party: coreParty, mainClass, extraRareRelative: t.luck ? 0.15 : 0 });
  const fx = game.researchEffects(researchOf(acc));
  const bonus = game.explorationBonuses(coreParty, mainClass);
  const goldFound = o.finds.reduce((s, f) => s + f.gold, 0);
  const gold = Math.round((o.gold + goldFound) * (1 + clanBonus(db, acc.id) + fx.explorationGold));
  db.prepare('UPDATE accounts SET gold = gold + ? WHERE id = ?').run(gold, acc.id);
  const highest = Math.max(...all.map((f) => f.level));
  const total = game.explorationTotalMs(t.base_travel_ms, t.base_explore_ms);
  const fighters = party.map((f) => {
    const gained = Math.round(o.xp * game.xpMultiplier(f.level, highest));
    const next = game.addXp(f, gained);
    const injured = o.injured.includes(f.id);
    const until = injured ? t.ends_at + Math.round(game.explorationInjuryMs(total, 1 - (1 - bonus.recoveryReduction) * (1 - fx.injuryReduction)) / clock.speed) : null;
    db.prepare('UPDATE fighters SET level = ?, xp = ?, status_kind = ?, status_until = ? WHERE id = ?').run(next.level, next.xp, injured ? 'injured' : 'idle', until, f.id);
    return { id: f.id, name: f.name, xp: gained, levelsGained: next.levelsGained, newLevel: next.level, injuredUntil: until };
  });
  const finds = o.finds.map((f) => ({
    kind: f.kind,
    gold: f.gold,
    items: f.items.map((item) => ({ name: game.itemName(item), rarity: item.rarity, icon: game.template(item.templateId)?.icon, qty: item.qty, kept: addItem(db, acc.id, item, t.ends_at) !== null })),
  }));
  const best = finds.flatMap((f) => f.items).reduce<string | null>((b, i) => (game.RARITIES.indexOf(i.rarity) > game.RARITIES.indexOf((b ?? 'common') as game.Rarity) ? i.rarity : b), null);
  const hours = Math.round((total / 3_600_000) * 4) / 4;
  addReport(db, acc.id, 'exploration', `Keşif döndü (${hours} saat)${best && ['epic', 'legendary'].includes(best) ? ` · ${game.RARITY_INFO[best as game.Rarity].name} buluntu!` : ''}`, {
    gold, goldFound, xp: o.xp, travelMs: t.base_travel_ms, exploreMs: t.base_explore_ms, finds, fighters, seed: t.seed,
  }, t.ends_at);
}
