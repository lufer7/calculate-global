import { randomBytes } from 'node:crypto';
import type { Hono } from 'hono';
import { game } from '@arena/core';
import type { FighterRow } from '../accounts/repo';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';
import { checkpointEnergy, energyView, fxOf, spendEnergy } from './energy';
import { battlerOf } from './gangRoutes';
import { addItem, itemView } from './items';
import type { GameClock } from './settle';
import { bestSkill, clanBonus, dayKey } from './settle';

type App = Hono<{ Variables: { subjectId: string; tokenHash: string } }>;

/** Sefer creature fights (instant, 1 energy) and the Cami (free, slow healing). */
export function registerHuntRoutes(app: App, db: Db, clock: GameClock) {
  const ownFighter = (accountId: string, id: unknown) =>
    db.prepare('SELECT * FROM fighters WHERE id = ? AND account_id = ?').get(String(id ?? ''), accountId) as FighterRow | undefined;

  app.post('/hunt', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const f = ownFighter(acc.id, b?.fighterId);
    const creature = game.CREATURES_BY_ID.get(String(b?.creatureId ?? ''));
    if (!f || !creature) return c.json({ error: 'not_found' }, 404);
    const all = fightersOf(db, acc.id);
    const zone = game.ZONES[creature.zoneId]!;
    if (game.accountLevel(all) < zone.minLevel) return c.json({ error: 'zone_locked', level: zone.minLevel }, 400);
    if (f.status_kind !== 'idle') return c.json({ error: 'fighter_busy' }, 400);
    if (f.hp_ratio < game.ARENA_MIN_HP) return c.json({ error: 'too_weak' }, 400);
    const fx = fxOf(acc);
    const now = clock.now();
    if (!spendEnergy(db, f, fx, clock, game.ENERGY.fightCost)) return c.json({ error: 'no_energy' }, 400);

    const mainClass = acc.main_class as game.ClassId | null;
    const seesProphecy = mainClass === 'seer' || bestSkill(all, 'daily_prophecy') > 0;
    const prophecy = seesProphecy && game.prophecyZone(dayKey(now), clock.prophecySecret) === zone.id
      ? game.accountPerks(mainClass).prophecyBaseBonus + bestSkill(all, 'daily_prophecy')
      : 0;
    const seed = randomBytes(4).readUInt32LE(0);
    const r = game.huntCreature({
      fighter: battlerOf(db, f), creature, seed, night: game.isNight(now),
      goldBonus: fx.huntGold + prophecy + clanBonus(db, acc.id), dropBonus: fx.huntDrop,
    });
    const highest = Math.max(...all.map((x) => x.level));
    const xp = Math.round(r.xp * game.xpMultiplier(f.level, highest));
    const next = game.addXp(f, xp);
    db.prepare('UPDATE fighters SET level = ?, xp = ?, hp_ratio = ?, hp_at = ? WHERE id = ?').run(next.level, next.xp, r.hpRatio, now, f.id);
    if (r.gold > 0) db.prepare('UPDATE accounts SET gold = gold + ? WHERE id = ?').run(r.gold, acc.id);
    const loot = [r.item, r.material].filter((x): x is Omit<game.ItemInstance, 'id'> => x !== null).map((item) => {
      const id = addItem(db, acc.id, item, now);
      return { name: game.itemName(item), rarity: item.rarity, icon: game.template(item.templateId)?.icon ?? 'unknown', qty: item.qty, kept: id !== null };
    });
    const fresh = db.prepare('SELECT * FROM fighters WHERE id = ?').get(f.id) as unknown as FighterRow;
    return c.json({
      won: r.won, seed, outcome: r.outcome, gold: r.gold, xp, levelsGained: next.levelsGained, hpRatio: r.hpRatio, prophecy: prophecy > 0,
      loot, energy: energyView(fresh, fx, clock),
      me: { name: f.name, class: f.class, level: next.level },
      foe: { name: creature.name, class: creature.style, level: creature.level },
    });
  });

  // ------------------------------------------------------------------ Cami
  const restRate = (fx: game.ResearchEffects) => game.CAMI_HEAL_PER_HOUR * (1 + fx.restHeal);

  app.post('/cami/rest', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const f = ownFighter(acc.id, b?.fighterId);
    if (!f) return c.json({ error: 'not_found' }, 404);
    if (f.status_kind !== 'idle') return c.json({ error: 'fighter_busy' }, 400);
    if (f.hp_ratio >= 1) return c.json({ error: 'hp_full' }, 400);
    const fx = fxOf(acc);
    const now = clock.now();
    checkpointEnergy(db, f, fx, clock, now);
    const until = now + Math.max(1000, Math.round(game.restTimeToFull(f.hp_ratio, restRate(fx)) / clock.speed));
    db.prepare("UPDATE fighters SET status_kind = 'resting', status_until = ?, hp_at = ? WHERE id = ?").run(until, now, f.id);
    return c.json({ until });
  });

  app.post('/cami/wake', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const f = ownFighter(acc.id, b?.fighterId);
    if (!f) return c.json({ error: 'not_found' }, 404);
    if (f.status_kind !== 'resting') return c.json({ error: 'not_resting' }, 400);
    const fx = fxOf(acc);
    checkpointEnergy(db, f, fx, clock); // with the faster resting rate up to now
    db.prepare("UPDATE fighters SET status_kind = 'idle', status_until = NULL WHERE id = ?").run(f.id);
    return c.json({ hpRatio: f.hp_ratio });
  });
}
