import { Hono } from 'hono';
import { game } from '@arena/core';
import { playerGuard } from '../accounts/guard';
import type { FighterRow } from '../accounts/repo';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';
import type { GameClock } from './settle';
import { bestSkill, dayKey, researchOf, settle, skillsOf } from './settle';
import { energyView, fxOf } from './energy';
import { registerHuntRoutes } from './huntRoutes';
import { battlerOf, registerGangRoutes } from './gangRoutes';
import { activeExplorations, explorationView, registerExplorationRoutes } from './explorationRoutes';
import { clanSummary, registerClanRoutes } from '../clan/routes';
import { bagCapacity, countOf, equippedOf, itemView } from './items';

/** Server-authoritative game API. Every handler settles due timers first. */
export function gameRoutes(db: Db, clock: GameClock) {
  const app = new Hono<{ Variables: { subjectId: string; tokenHash: string } }>();
  app.use('*', playerGuard(db, clock.now));
  app.use('*', async (c, next) => {
    settle(db, c.get('subjectId'), clock);
    await next();
  });

  app.get('/state', (c) => {
    const now = clock.now();
    const acc = accountById(db, c.get('subjectId'))!;
    const fighters = fightersOf(db, acc.id);
    const mainClass = acc.main_class as game.ClassId | null;
    const research = researchOf(acc);
    const fx = fxOf(acc);
    const level = game.accountLevel(fighters);
    const seesProphecy = mainClass === 'seer' || bestSkill(fighters, 'daily_prophecy') > 0;
    return c.json({
      serverTime: now,
      gameSpeed: clock.speed,
      account: {
        displayName: acc.display_name,
        gold: acc.gold,
        mainClass,
        mainClassPerk: mainClass ? game.MAIN_CLASS_PERKS[mainClass] : null,
        accountLevel: level,
        fighterSlots: game.fighterSlots(level),
        research,
        activeResearch: acc.active_research ? JSON.parse(acc.active_research) : null,
      },
      researchEffects: fx,
      bagCapacity: bagCapacity(db, acc.id),
      arenaShieldUntil: acc.arena_shield_until && acc.arena_shield_until > now ? acc.arena_shield_until : null,
      explorationSlots: game.explorationSlots(game.highestScoutLevel(fighters)) + fx.explorationSlots,
      explorations: activeExplorations(db, acc.id).map(explorationView),
      clan: clanSummary(db, acc.id, now),
      prophecyZone: seesProphecy ? game.prophecyZone(dayKey(now), clock.prophecySecret) : null,
      fighters: fighters.map((f) => {
        const profile = game.battleProfile({ ...battlerOf(db, f), hpRatio: 1 });
        return {
          id: f.id, name: f.name, class: f.class, level: f.level, xp: f.xp, xpToNext: game.xpToNext(f.level),
          hpRatio: f.hp_ratio, status: f.status_kind, statusUntil: f.status_until, skills: skillsOf(f),
          skillPoints: game.totalSkillPoints(f.level) - game.pointsSpent(skillsOf(f)),
          respecFree: f.respec_count === 0,
          equipment: equippedOf(db, f.id).map((i) => itemView(i)),
          profile,
          power: game.powerScore(profile),
          arena: { points: f.arena_points, wins: f.arena_wins, losses: f.arena_losses, readyAt: f.arena_ready_at },
          energy: energyView(f, fx, clock),
        };
      }),
      luckPotions: countOf(db, acc.id, 'potion_luck'),
      unreadReports: (db.prepare('SELECT COUNT(*) n FROM reports WHERE account_id = ? AND read = 0').get(acc.id) as { n: number }).n,
    });
  });

  registerGangRoutes(app, db, clock);
  registerExplorationRoutes(app, db, clock);
  registerHuntRoutes(app, db, clock);
  registerClanRoutes(app, db, clock);

  app.post('/fighters/:id/skills', async (c) => {
    const b = await c.req.json().catch(() => null);
    const f = ownFighter(db, c.get('subjectId'), c.req.param('id'));
    if (!f) return c.json({ error: 'not_found' }, 404);
    const r = game.rankUp({ class: f.class as game.ClassId, level: f.level, skills: skillsOf(f) }, String(b?.skillId ?? ''));
    if (!r.ok) return c.json({ error: r.error }, 400);
    db.prepare('UPDATE fighters SET skills_json = ? WHERE id = ?').run(JSON.stringify(r.value), f.id);
    return c.json({ skills: r.value });
  });

  app.post('/fighters/:id/respec', (c) => {
    const f = ownFighter(db, c.get('subjectId'), c.req.param('id'));
    if (!f) return c.json({ error: 'not_found' }, 404);
    const r = game.canRespec({ count: f.respec_count, lastAt: f.respec_at }, clock.now(), false); // Unutma İksiri arrives with the inventory
    if (!r.ok) return c.json({ error: r.error }, 400);
    db.prepare("UPDATE fighters SET skills_json = '{}', respec_count = respec_count + 1, respec_at = ? WHERE id = ?").run(clock.now(), f.id);
    return c.json({ skills: {} });
  });

  app.get('/reports', (c) => {
    const rows = db.prepare('SELECT id, kind, title, body_json, at, read FROM reports WHERE account_id = ? ORDER BY at DESC, id DESC LIMIT 100').all(c.get('subjectId')) as {
      id: number; kind: string; title: string; body_json: string; at: number; read: number;
    }[];
    return c.json({ reports: rows.map(({ body_json, ...r }) => ({ ...r, read: r.read === 1, body: JSON.parse(body_json) })) });
  });

  app.post('/reports/read', (c) => {
    db.prepare('UPDATE reports SET read = 1 WHERE account_id = ? AND read = 0').run(c.get('subjectId'));
    return c.body(null, 204);
  });

  /** Rasathane: one research at a time, paid in gold, shortened by Seer perks/skills. */
  app.post('/research', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const why = game.canResearch(researchOf(acc), String(b?.id ?? ''));
    if (why) return c.json({ error: why }, 400);
    const def = game.RESEARCH[String(b.id)]!;
    if (acc.active_research) return c.json({ error: 'busy' }, 409);
    const next = (researchOf(acc)[def.id] ?? 0) + 1;
    const cost = def.cost(next);
    if (acc.gold < cost) return c.json({ error: 'not_enough_gold', cost }, 400);
    const fighters = fightersOf(db, acc.id);
    const idleSeers = fighters.filter((f) => f.class === 'seer' && f.status_kind === 'idle');
    const reductions = [
      game.accountPerks(acc.main_class as game.ClassId | null).researchDurationReduction,
      bestSkill(idleSeers, 'astronomy'),
      idleSeers.length > 0 ? 0.05 : 0, // Seer class passive: −5% while a Seer is at home
    ];
    const until = clock.now() + Math.max(1000, Math.round(game.researchDuration(def, next, reductions) / clock.speed));
    db.prepare('UPDATE accounts SET gold = gold - ?, active_research = ? WHERE id = ?').run(cost, JSON.stringify({ id: def.id, level: next, until }), acc.id);
    return c.json({ id: def.id, level: next, until, cost });
  });

  return app;
}

function ownFighter(db: Db, accountId: string, fighterId: string) {
  return db.prepare('SELECT * FROM fighters WHERE id = ? AND account_id = ?').get(fighterId, accountId) as FighterRow | undefined;
}
