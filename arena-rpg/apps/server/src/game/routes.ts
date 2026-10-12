import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { game } from '@arena/core';
import { playerGuard } from '../accounts/guard';
import type { FighterRow } from '../accounts/repo';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';
import { randomId } from '../lib/security';
import type { ExpeditionRow, GameClock } from './settle';
import { bestSkill, dayKey, researchOf, settle, skillsOf } from './settle';

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
    const active = db.prepare("SELECT * FROM expeditions WHERE account_id = ? AND state IN ('active', 'recalled') ORDER BY ends_at").all(acc.id) as unknown as ExpeditionRow[];
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
      expeditionSlots: game.expeditionSlots(research.expedition_logistics ?? 0, game.highestScoutLevel(fighters.map(toCore), now)),
      prophecyZone: seesProphecy ? game.prophecyZone(dayKey(now), clock.prophecySecret) : null,
      fighters: fighters.map((f) => ({
        id: f.id, name: f.name, class: f.class, level: f.level, xp: f.xp, xpToNext: game.xpToNext(f.level),
        hpRatio: f.hp_ratio, status: f.status_kind, statusUntil: f.status_until, skills: skillsOf(f),
        skillPoints: game.totalSkillPoints(f.level) - game.pointsSpent(skillsOf(f)),
        respecFree: f.respec_count === 0,
      })),
      expeditions: active.map((e) => ({ id: e.id, zoneId: e.zone_id, fighterIds: JSON.parse(e.fighter_ids), startedAt: e.started_at, endsAt: e.ends_at, recalled: e.state === 'recalled' })),
      unreadReports: (db.prepare('SELECT COUNT(*) n FROM reports WHERE account_id = ? AND read = 0').get(acc.id) as { n: number }).n,
    });
  });

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

  app.post('/expeditions', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const all = fightersOf(db, acc.id);
    const ids: string[] = Array.isArray(b?.fighterIds) ? [...new Set(b.fighterIds.map(String))] as string[] : [];
    const party = all.filter((f) => ids.includes(f.id));
    if (party.length !== ids.length) return c.json({ error: 'not_found' }, 404);
    const now = clock.now();
    const activeCount = (db.prepare("SELECT COUNT(*) n FROM expeditions WHERE account_id = ? AND state IN ('active', 'recalled')").get(acc.id) as { n: number }).n;
    const plan = game.planExpedition({
      zoneId: String(b?.zoneId ?? ''), party: party.map(toCore), allFighters: all.map(toCore),
      activeExpeditions: activeCount, researchLevel: researchOf(acc).expedition_logistics ?? 0, now, mainClass: acc.main_class as game.ClassId | null,
    });
    if (!plan.ok) return c.json({ error: plan.error }, 400);
    const zone = game.ZONES[b.zoneId]!;
    const durationMs = Math.max(1000, Math.round(plan.value.durationMs / clock.speed));
    const id = randomId();
    db.prepare('INSERT INTO expeditions (id, account_id, zone_id, fighter_ids, started_at, ends_at, base_duration_ms, seed, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, acc.id, zone.id, JSON.stringify(ids), now, now + durationMs, Math.round(zone.baseDurationMs / clock.speed), randomBytes(4).readUInt32LE(0), 'active',
    );
    for (const f of party) db.prepare("UPDATE fighters SET status_kind = 'expedition', status_until = ? WHERE id = ?").run(now + durationMs, f.id);
    return c.json({ id, endsAt: now + durationMs, leavesCastleEmpty: plan.value.leavesCastleEmpty, underLevel: plan.value.underLevel }, 201);
  });

  app.post('/expeditions/:id/recall', (c) => {
    const exp = db.prepare("SELECT * FROM expeditions WHERE id = ? AND account_id = ? AND state = 'active'").get(c.req.param('id'), c.get('subjectId')) as ExpeditionRow | undefined;
    if (!exp) return c.json({ error: 'not_found' }, 404);
    const back = game.recallReturnTime(exp.started_at, clock.now());
    db.prepare("UPDATE expeditions SET state = 'recalled', ends_at = ? WHERE id = ?").run(back, exp.id);
    for (const id of JSON.parse(exp.fighter_ids) as string[]) db.prepare('UPDATE fighters SET status_until = ? WHERE id = ?').run(back, id);
    return c.json({ returnsAt: back });
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

  /** Kafa Kazanı: one research at a time, paid in gold, shortened by Seer perks/skills. */
  app.post('/research', async (c) => {
    const b = await c.req.json().catch(() => null);
    const def = game.RESEARCH[String(b?.id ?? '')];
    if (!def) return c.json({ error: 'unknown_research' }, 400);
    const acc = accountById(db, c.get('subjectId'))!;
    if (acc.active_research) return c.json({ error: 'busy' }, 409);
    const next = (researchOf(acc)[def.id] ?? 0) + 1;
    if (next > def.maxLevel) return c.json({ error: 'max_level' }, 400);
    const cost = def.cost(next);
    if (acc.gold < cost) return c.json({ error: 'not_enough_gold', cost }, 400);
    const fighters = fightersOf(db, acc.id);
    const idleSeers = fighters.filter((f) => f.class === 'seer' && f.status_kind === 'idle');
    const reductions = [
      game.accountPerks(acc.main_class as game.ClassId | null).researchDurationReduction,
      bestSkill(idleSeers, 'astronomy'),
      idleSeers.length > 0 ? 0.05 : 0, // Seer class passive: −5% while a Seer is at the castle
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

function toCore(f: FighterRow): game.Fighter {
  const status: game.FighterStatus =
    f.status_kind === 'idle' || f.status_until === null
      ? { kind: 'idle' }
      : f.status_kind === 'expedition'
        ? { kind: 'expedition', expeditionId: '', until: f.status_until }
        : { kind: f.status_kind, until: f.status_until };
  return { id: f.id, name: f.name, class: f.class as game.ClassId, level: f.level, xp: f.xp, hpRatio: f.hp_ratio, skills: skillsOf(f), status };
}
