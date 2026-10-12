import { randomBytes } from 'node:crypto';
import type { Hono } from 'hono';
import { game } from '@arena/core';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';
import { randomId } from '../lib/security';
import type { ExplorationRow, GameClock } from './settle';

type App = Hono<{ Variables: { subjectId: string; tokenHash: string } }>;

export const activeExplorations = (db: Db, accountId: string) =>
  db.prepare("SELECT * FROM explorations WHERE account_id = ? AND state IN ('active', 'recalled') ORDER BY ends_at").all(accountId) as unknown as ExplorationRow[];

export const explorationView = (t: ExplorationRow) => ({
  id: t.id, fighterIds: JSON.parse(t.fighter_ids) as string[], startedAt: t.started_at, endsAt: t.ends_at,
  travelMs: t.base_travel_ms, exploreMs: t.base_explore_ms, recalled: t.state === 'recalled',
  // phase boundaries in real (speed-adjusted) time, for the progress bar
  arriveAt: t.started_at + t.travel_ms, leaveAt: t.started_at + t.travel_ms + t.explore_ms,
});

/** Keşif: Ogame-style long trips; times are chosen by the player in 15 minute steps. */
export function registerExplorationRoutes(app: App, db: Db, clock: GameClock) {
  app.post('/explorations', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const all = fightersOf(db, acc.id);
    const ids: string[] = Array.isArray(b?.fighterIds) ? ([...new Set(b.fighterIds.map(String))] as string[]) : [];
    const party = all.filter((f) => ids.includes(f.id));
    if (ids.length === 0) return c.json({ error: 'empty_party' }, 400);
    if (party.length !== ids.length) return c.json({ error: 'not_found' }, 404);
    const travelMs = Number(b?.travelMs);
    const exploreMs = Number(b?.exploreMs);
    if (!game.validTimes(travelMs, exploreMs)) return c.json({ error: 'invalid_time' }, 400);
    if (party.some((f) => f.status_kind !== 'idle')) return c.json({ error: 'fighter_busy' }, 400);
    const highestScout = all.filter((f) => f.class === 'scout').reduce((m, f) => Math.max(m, f.level), 0);
    if (activeExplorations(db, acc.id).length >= game.explorationSlots(highestScout)) return c.json({ error: 'no_free_slot' }, 400);
    const now = clock.now();
    const travel = Math.max(500, Math.round(travelMs / clock.speed));
    const explore = Math.round(exploreMs / clock.speed);
    const endsAt = now + travel * 2 + explore;
    const id = randomId();
    db.prepare('INSERT INTO explorations (id, account_id, fighter_ids, started_at, travel_ms, explore_ms, base_travel_ms, base_explore_ms, ends_at, seed, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, acc.id, JSON.stringify(ids), now, travel, explore, travelMs, exploreMs, endsAt, randomBytes(4).readUInt32LE(0), 'active');
    for (const f of party) db.prepare("UPDATE fighters SET status_kind = 'exploration', status_until = ? WHERE id = ?").run(endsAt, f.id);
    return c.json({ id, endsAt }, 201);
  });

  app.post('/explorations/:id/recall', (c) => {
    const t = db.prepare("SELECT * FROM explorations WHERE id = ? AND account_id = ? AND state = 'active'").get(c.req.param('id'), c.get('subjectId')) as ExplorationRow | undefined;
    if (!t) return c.json({ error: 'not_found' }, 404);
    const back = game.explorationRecallReturn(t.started_at, t.travel_ms, clock.now());
    db.prepare("UPDATE explorations SET state = 'recalled', ends_at = ? WHERE id = ?").run(back, t.id);
    for (const id of JSON.parse(t.fighter_ids) as string[]) db.prepare('UPDATE fighters SET status_until = ? WHERE id = ?').run(back, id);
    return c.json({ returnsAt: back });
  });
}
