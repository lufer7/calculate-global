import { randomBytes } from 'node:crypto';
import type { Hono } from 'hono';
import { createRng, game } from '@arena/core';
import type { AccountRow, FighterRow } from '../accounts/repo';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';
import type { ItemRow } from './items';
import { addItem, bagCapacity, bagCount, consume, countOf, equippedOf, fighterGear, itemView, itemsOf, takeResources, toInstance } from './items';
import { energyView, fxOf, spendEnergy } from './energy';
import type { ExplorationRow, GameClock } from './settle';
import { addReport, bestSkill, skillsOf } from './settle';

type App = Hono<{ Variables: { subjectId: string; tokenHash: string } }>;

const smithReduction = (acc: AccountRow, fighters: FighterRow[]) =>
  bestSkill(fighters, 'smiths_friend') + game.accountPerks(acc.main_class as game.ClassId | null).smithCostReduction;

export function battlerOf(db: Db, f: FighterRow): game.BattlerInput {
  const owner = db.prepare('SELECT research_json FROM accounts WHERE id = ?').get(f.account_id) as { research_json: string } | undefined;
  const fx = owner ? fxOf(owner) : game.NO_RESEARCH;
  return {
    name: f.name, class: f.class as game.ClassId, level: f.level, skills: skillsOf(f), gear: fighterGear(db, f.id), hpRatio: f.hp_ratio,
    bonus: { damage: fx.damage, armor: fx.armor },
  };
}

/** Inventory & paper doll, blacksmith, consumables, Salı Pazarı, arena and alchemy. */
export function registerGangRoutes(app: App, db: Db, clock: GameClock) {
  const own = (c: { get: (k: 'subjectId') => string }) => accountById(db, c.get('subjectId'))!;
  const ownFighter = (accountId: string, id: unknown) =>
    db.prepare('SELECT * FROM fighters WHERE id = ? AND account_id = ?').get(String(id ?? ''), accountId) as FighterRow | undefined;
  const ownItem = (accountId: string, id: string) =>
    db.prepare('SELECT * FROM items WHERE id = ? AND account_id = ?').get(id, accountId) as ItemRow | undefined;

  // ---------------------------------------------------------------- inventory
  app.get('/inventory', (c) => {
    const acc = own(c);
    const red = smithReduction(acc, fightersOf(db, acc.id));
    const sell = fxOf(acc).sellBonus;
    return c.json({ capacity: bagCapacity(db, acc.id), used: bagCount(db, acc.id), smithReduction: red, items: itemsOf(db, acc.id).map((r) => itemView(r, red, sell)) });
  });

  app.post('/items/:id/equip', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = own(c);
    const item = ownItem(acc.id, c.req.param('id'));
    const f = ownFighter(acc.id, b?.fighterId);
    if (!item || !f) return c.json({ error: 'not_found' }, 404);
    if (f.status_kind === 'expedition' || f.status_kind === 'exploration') return c.json({ error: 'fighter_busy' }, 400);
    const t = game.template(item.template_id);
    if (!t?.slot) return c.json({ error: 'not_equipment' }, 400);
    const candidates = game.slotsFor(t.slot);
    const equipped = equippedOf(db, f.id);
    const requested = typeof b?.slot === 'string' && candidates.includes(b.slot) ? (b.slot as game.EquipSlot) : null;
    const slot = requested ?? candidates.find((s) => !equipped.some((e) => e.slot === s)) ?? candidates[0]!;
    const err = game.canEquip(toInstance(item), { class: f.class as game.ClassId, level: f.level }, slot);
    if (err) return c.json({ error: err }, 400);
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE items SET fighter_id = NULL, slot = NULL WHERE fighter_id = ? AND slot = ?').run(f.id, slot); // swap back to bag
      db.prepare('UPDATE items SET fighter_id = ?, slot = ? WHERE id = ?').run(f.id, slot, item.id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return c.json({ ok: true, slot });
  });

  app.post('/items/:id/unequip', (c) => {
    const acc = own(c);
    const item = ownItem(acc.id, c.req.param('id'));
    if (!item || !item.fighter_id) return c.json({ error: 'not_found' }, 404);
    if (bagCount(db, acc.id) >= bagCapacity(db, acc.id)) return c.json({ error: 'inventory_full' }, 400);
    db.prepare('UPDATE items SET fighter_id = NULL, slot = NULL WHERE id = ?').run(item.id);
    return c.json({ ok: true });
  });

  app.post('/items/:id/sell', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = own(c);
    const item = ownItem(acc.id, c.req.param('id'));
    if (!item) return c.json({ error: 'not_found' }, 404);
    if (item.fighter_id) return c.json({ error: 'equipped' }, 400);
    const qty = Math.max(1, Math.min(item.qty, Number(b?.qty) || item.qty));
    const gold = Math.max(1, Math.round(game.sellPrice(toInstance(item)) * (1 + fxOf(acc).sellBonus))) * qty;
    consume(db, item, qty);
    db.prepare('UPDATE accounts SET gold = gold + ? WHERE id = ?').run(gold, acc.id);
    return c.json({ gold });
  });

  /** "+ basma": drop a duplicate (same item and rarity) onto an item for +1; gold cost grows each step. */
  app.post('/items/:id/merge', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = own(c);
    const target = ownItem(acc.id, c.req.param('id'));
    const source = ownItem(acc.id, String(b?.sourceId ?? ''));
    if (!target || !source) return c.json({ error: 'not_found' }, 404);
    if (source.fighter_id) return c.json({ error: 'equipped' }, 400);
    const why = game.canMerge(toInstance(target), toInstance(source));
    if (why) return c.json({ error: why }, 400);
    const result = { ...toInstance(target), itemLevel: Math.max(target.item_level, source.item_level), upgrade: Math.max(target.upgrade, source.upgrade) };
    const cost = game.upgradeCost(result, smithReduction(acc, fightersOf(db, acc.id)));
    if (acc.gold < cost) return c.json({ error: 'not_enough_gold', cost }, 400);
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE accounts SET gold = gold - ? WHERE id = ?').run(cost, acc.id);
      db.prepare('UPDATE items SET upgrade = ?, item_level = ? WHERE id = ?').run(result.upgrade + 1, result.itemLevel, target.id);
      db.prepare('DELETE FROM items WHERE id = ?').run(source.id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return c.json({ upgrade: result.upgrade + 1, itemLevel: result.itemLevel, cost });
  });

  /** Food and potions. */
  app.post('/items/:id/use', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = own(c);
    const item = ownItem(acc.id, c.req.param('id'));
    if (!item) return c.json({ error: 'not_found' }, 404);
    const t = game.template(item.template_id);
    const now = clock.now();
    if (t?.kind === 'food') {
      const f = ownFighter(acc.id, b?.fighterId);
      if (!f) return c.json({ error: 'not_found' }, 404);
      if (f.hp_ratio >= 1) return c.json({ error: 'hp_full' }, 400);
      const hp = Math.min(1, f.hp_ratio + (t.heal ?? 0));
      db.prepare('UPDATE fighters SET hp_ratio = ?, hp_at = ? WHERE id = ?').run(hp, now, f.id);
      consume(db, item);
      return c.json({ hpRatio: hp });
    }
    if (item.template_id === 'potion_heal') {
      const f = ownFighter(acc.id, b?.fighterId);
      if (!f) return c.json({ error: 'not_found' }, 404);
      if (f.status_kind !== 'injured' && f.hp_ratio >= 1) return c.json({ error: 'not_injured' }, 400);
      db.prepare("UPDATE fighters SET status_kind = CASE WHEN status_kind = 'injured' THEN 'idle' ELSE status_kind END, status_until = CASE WHEN status_kind = 'injured' THEN NULL ELSE status_until END, hp_ratio = 1, hp_at = ? WHERE id = ?").run(now, f.id);
      consume(db, item);
      return c.json({ ok: true });
    }
    if (item.template_id === 'potion_haste') {
      // Hız İksiri: the party of a running keşif comes back 10% sooner.
      const t = db.prepare("SELECT * FROM explorations WHERE id = ? AND account_id = ? AND state = 'active'").get(String(b?.explorationId ?? ''), acc.id) as ExplorationRow | undefined;
      if (!t) return c.json({ error: 'no_active_exploration' }, 400);
      const endsAt = now + Math.round(Math.max(0, t.ends_at - now) * 0.9);
      db.prepare('UPDATE explorations SET ends_at = ? WHERE id = ?').run(endsAt, t.id);
      for (const id of JSON.parse(t.fighter_ids) as string[]) db.prepare('UPDATE fighters SET status_until = ? WHERE id = ?').run(endsAt, id);
      consume(db, item);
      return c.json({ endsAt });
    }
    if (item.template_id === 'potion_forget') {
      const f = ownFighter(acc.id, b?.fighterId);
      if (!f) return c.json({ error: 'not_found' }, 404);
      const r = game.canRespec({ count: Math.max(1, f.respec_count), lastAt: f.respec_at }, now, true);
      if (!r.ok) return c.json({ error: r.error }, 400);
      db.prepare("UPDATE fighters SET skills_json = '{}', respec_count = respec_count + 1, respec_at = ? WHERE id = ?").run(now, f.id);
      consume(db, item);
      return c.json({ ok: true });
    }
    if (item.template_id === 'potion_luck') return c.json({ error: 'use_when_sending' }, 400);
    return c.json({ error: 'not_usable' }, 400);
  });

  // ---------------------------------------------------------------- Salı Pazarı
  const stockFor = (acc: AccountRow) => {
    const level = game.accountLevel(fightersOf(db, acc.id));
    const hourKey = game.marketHourKey(clock.now(), clock.speed);
    const discount = Math.min(0.5, fxOf(acc).marketDiscount);
    const offers = game.marketStock(acc.id, hourKey, level, acc.main_class as game.ClassId | null, clock.prophecySecret)
      .map((o) => ({ ...o, price: Math.max(1, Math.round(o.price * (1 - discount))) }));
    return { hourKey, offers };
  };

  app.get('/market', (c) => {
    const acc = own(c);
    const { hourKey, offers } = stockFor(acc);
    const bought = new Set((db.prepare('SELECT offer_id FROM market_purchases WHERE account_id = ? AND hour_key = ?').all(acc.id, hourKey) as { offer_id: string }[]).map((r) => r.offer_id));
    return c.json({
      nextRefresh: game.nextMarketRefresh(clock.now(), clock.speed),
      offers: offers.map((o) => ({
        offerId: o.offerId,
        section: o.section,
        price: o.price,
        soldOut: bought.has(o.offerId),
        item: itemView({ id: o.offerId, account_id: acc.id, template_id: o.item.templateId, item_level: o.item.itemLevel, rarity: o.item.rarity, upgrade: 0, qty: o.item.qty, fighter_id: null, slot: null, created_at: 0 }),
      })),
    });
  });

  app.post('/market/buy', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = own(c);
    const { hourKey, offers } = stockFor(acc);
    const offer = offers.find((o) => o.offerId === b?.offerId);
    if (!offer) return c.json({ error: 'not_found' }, 404);
    const sold = db.prepare('SELECT 1 FROM market_purchases WHERE account_id = ? AND hour_key = ? AND offer_id = ?').get(acc.id, hourKey, offer.offerId);
    if (sold) return c.json({ error: 'sold_out' }, 400);
    if (acc.gold < offer.price) return c.json({ error: 'not_enough_gold' }, 400);
    db.exec('BEGIN');
    try {
      if (!addItem(db, acc.id, offer.item, clock.now())) {
        db.exec('ROLLBACK');
        return c.json({ error: 'inventory_full' }, 400);
      }
      db.prepare('UPDATE accounts SET gold = gold - ? WHERE id = ?').run(offer.price, acc.id);
      db.prepare('INSERT INTO market_purchases (account_id, hour_key, offer_id) VALUES (?, ?, ?)').run(acc.id, hourKey, offer.offerId);
      db.prepare('DELETE FROM market_purchases WHERE account_id = ? AND hour_key < ?').run(acc.id, hourKey - 48);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return c.json({ ok: true, gold: acc.gold - offer.price });
  });

  // ---------------------------------------------------------------- Arena
  const npcFor = (f: FighterRow) => game.arenaNpcs(f.id, f.level, f.arena_roll, clock.prophecySecret);
  const opponentsFor = (acc: AccountRow, f: FighterRow) => {
    const players = db
      .prepare(
        `SELECT f.*, a.display_name, cl.tag AS clan_tag FROM fighters f JOIN accounts a ON a.id = f.account_id
         LEFT JOIN clan_members m ON m.account_id = a.id LEFT JOIN clans cl ON cl.id = m.clan_id
         WHERE f.account_id != ? AND a.status = 'active' AND f.level BETWEEN ? AND ?
           -- banner mates fight side by side, never against each other
           AND (m.clan_id IS NULL OR m.clan_id IS NOT (SELECT clan_id FROM clan_members WHERE account_id = ?))
         ORDER BY ABS(f.level - ?), f.arena_points DESC LIMIT 3`,
      )
      .all(acc.id, f.level - 5, f.level + 5, acc.id, f.level) as unknown as (FighterRow & { display_name: string; clan_tag: string | null })[];
    return { npcs: npcFor(f), players };
  };

  app.get('/arena', (c) => {
    const acc = own(c);
    const f = ownFighter(acc.id, c.req.query('fighterId')) ?? fightersOf(db, acc.id)[0];
    if (!f) return c.json({ error: 'not_found' }, 404);
    const { npcs, players } = opponentsFor(acc, f);
    const power = (bt: game.BattlerInput) => game.powerScore(game.battleProfile({ ...bt, hpRatio: 1 }));
    return c.json({
      fighterId: f.id,
      readyAt: f.arena_ready_at,
      hpRatio: f.hp_ratio,
      minHp: game.ARENA_MIN_HP,
      npcs: npcs.map((n) => ({ id: n.id, name: n.battler.name, class: n.battler.class, level: n.battler.level, power: power(n.battler) })),
      players: players.map((p) => ({ id: p.id, name: p.name, owner: p.display_name, clanTag: p.clan_tag, class: p.class, level: p.level, points: p.arena_points, power: power(battlerOf(db, p)) })),
      ranking: (db.prepare(
        `SELECT f.name, f.class, f.level, f.arena_points AS points, f.arena_wins AS wins, a.display_name AS owner, cl.tag AS clanTag FROM fighters f JOIN accounts a ON a.id = f.account_id
         LEFT JOIN clan_members m ON m.account_id = a.id LEFT JOIN clans cl ON cl.id = m.clan_id
         WHERE a.status = 'active' ORDER BY f.arena_points DESC, f.level DESC LIMIT 20`,
      ).all()),
      clanRanking: (db.prepare(
        `SELECT cl.name, cl.tag, cl.emblem_color AS color, cl.emblem_symbol AS symbol, SUM(f.arena_points) AS points, COUNT(DISTINCT m.account_id) AS members
         FROM clans cl JOIN clan_members m ON m.clan_id = cl.id JOIN fighters f ON f.account_id = m.account_id
         GROUP BY cl.id ORDER BY points DESC LIMIT 10`,
      ).all()),
    });
  });

  app.post('/arena/fight', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = own(c);
    const f = ownFighter(acc.id, b?.fighterId);
    if (!f) return c.json({ error: 'not_found' }, 404);
    const now = clock.now();
    if (f.status_kind !== 'idle') return c.json({ error: 'fighter_busy' }, 400);
    if (f.hp_ratio < game.ARENA_MIN_HP) return c.json({ error: 'too_weak' }, 400);

    let foe: game.BattlerInput;
    let vsPlayer = false;
    let defender: (FighterRow & { display_name: string }) | null = null;
    let foeInfo: { name: string; class: string; level: number; owner?: string };
    if (b?.opponent?.type === 'player') {
      const { players } = opponentsFor(acc, f);
      const p = players.find((x) => x.id === b.opponent.id);
      if (!p) return c.json({ error: 'not_found' }, 404);
      defender = p;
      foe = { ...battlerOf(db, p), hpRatio: 1 }; // defenders always fight fresh and lose nothing
      vsPlayer = true;
      foeInfo = { name: p.name, class: p.class, level: p.level, owner: p.clan_tag ? `[${p.clan_tag}] ${p.display_name}` : p.display_name };
    } else {
      const npc = npcFor(f).find((n) => n.id === b?.opponent?.id);
      if (!npc) return c.json({ error: 'not_found' }, 404);
      foe = npc.battler;
      foeInfo = { name: npc.battler.name, class: npc.battler.class, level: npc.battler.level };
    }
    const fx = fxOf(acc);
    if (!spendEnergy(db, f, fx, clock, game.ENERGY.fightCost)) return c.json({ error: 'no_energy' }, 400);
    const me = battlerOf(db, f);
    const seed = randomBytes(4).readUInt32LE(0);
    const outcome = game.fight(me, foe, seed, { night: game.isNight(now) });
    const won = outcome.winner === 'a';
    const all = fightersOf(db, acc.id);
    const highest = Math.max(...all.map((x) => x.level));
    const fame = game.skillValue(game.SKILLS_BY_ID.get('arena_fame')!, skillsOf(f).arena_fame ?? 0);
    const base = game.arenaRewards(won, f.level, vsPlayer, fame);
    const r = { ...base, gold: Math.round(base.gold * (1 + fx.arenaGold)) };
    const xp = Math.round(r.xp * game.xpMultiplier(f.level, highest));
    const next = game.addXp(f, xp);
    const hp = won ? f.hp_ratio : Math.max(0, f.hp_ratio - game.ARENA_HP_LOSS);
    db.prepare(
      `UPDATE fighters SET level = ?, xp = ?, hp_ratio = ?, hp_at = ?, arena_points = MAX(0, arena_points + ?), arena_wins = arena_wins + ?, arena_losses = arena_losses + ?,
       arena_roll = arena_roll + 1 WHERE id = ?`,
    ).run(next.level, next.xp, hp, now, r.points, won ? 1 : 0, won ? 0 : 1, f.id);
    db.prepare('UPDATE accounts SET gold = gold + ? WHERE id = ?').run(r.gold, acc.id);

    // PvP: the winner steals ~30% of the loser's gold (an hour of protection after a robbery) and may find an item.
    let stolen = 0;
    let loot: { name: string; rarity: game.Rarity; icon: string; qty: number; kept: boolean } | null = null;
    if (defender) {
      const victim = accountById(db, defender.account_id)!;
      if (won) {
        const shielded = victim.arena_shield_until !== null && victim.arena_shield_until > now;
        const reduction = 1 - (1 - fxOf(victim).plunderProtection) * (1 - game.accountPerks(victim.main_class as game.ClassId | null).defenseGoldLossReduction);
        stolen = game.arenaPlunder({ defenderGold: victim.gold, attackerBonus: game.accountPerks(acc.main_class as game.ClassId | null).plunderBonus, defenderReduction: reduction, shielded });
        if (stolen > 0) {
          db.prepare('UPDATE accounts SET gold = gold - ?, arena_shield_until = ? WHERE id = ?').run(stolen, now + Math.round(game.ARENA_PLUNDER.shieldMs / clock.speed), victim.id);
          db.prepare('UPDATE accounts SET gold = gold + ? WHERE id = ?').run(stolen, acc.id);
        }
        const item = game.arenaLoot(createRng(seed ^ 0x9e3779b9), f.level);
        if (item) loot = { name: game.itemName(item), rarity: item.rarity, icon: game.template(item.templateId)?.icon ?? 'unknown', qty: 1, kept: addItem(db, acc.id, item, now) !== null };
        addReport(db, victim.id, 'arena_defense', `Arenada ${defender.name} yenildi${stolen > 0 ? `: ${stolen} altın çalındı` : ''}`, {
          won: false, attacker: acc.display_name, attackerFighter: f.name, defenderFighter: defender.name, stolen, shielded,
        }, now);
      } else {
        addReport(db, victim.id, 'arena_defense', `Arenada ${defender.name} saldırıyı püskürttü`, { won: true, attacker: acc.display_name, attackerFighter: f.name, defenderFighter: defender.name, stolen: 0 }, now);
      }
    }
    const fresh = db.prepare('SELECT * FROM fighters WHERE id = ?').get(f.id) as unknown as FighterRow;
    return c.json({
      won, seed, outcome,
      me: { name: f.name, class: f.class, level: f.level }, foe: foeInfo,
      rewards: { gold: r.gold, xp, points: r.points, levelsGained: next.levelsGained, stolen, loot }, hpRatio: hp,
      energy: energyView(fresh, fx, clock),
    });
  });

  // ---------------------------------------------------------------- Simya
  app.get('/alchemy', (c) => {
    const acc = own(c);
    const seers = fightersOf(db, acc.id).filter((f) => f.class === 'seer');
    return c.json({
      seers: seers.map((s) => ({ id: s.id, name: s.name, rank: skillsOf(s).potion_making ?? 0 })),
      resources: Object.fromEntries(game.RESOURCE_IDS.map((id) => [id, countOf(db, acc.id, id)])),
      recipes: game.RECIPES.map((r) => ({ ...r, gold: Math.round(r.gold * (1 - Math.min(0.6, fxOf(acc).alchemyDiscount))), outputName: game.template(r.output)!.name, icon: game.template(r.output)!.icon })),
    });
  });

  app.post('/alchemy/craft', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = own(c);
    const f = ownFighter(acc.id, b?.fighterId);
    const recipe = game.RECIPES.find((r) => r.id === b?.recipeId);
    if (!f || !recipe) return c.json({ error: 'not_found' }, 404);
    if (f.class !== 'seer') return c.json({ error: 'wrong_class' }, 400);
    const skills = skillsOf(f);
    if ((skills.potion_making ?? 0) < recipe.minRank) return c.json({ error: 'rank_too_low' }, 400);
    const price = Math.round(recipe.gold * (1 - Math.min(0.6, fxOf(acc).alchemyDiscount)));
    if (acc.gold < price) return c.json({ error: 'not_enough_gold' }, 400);
    for (const [id, qty] of Object.entries(recipe.inputs)) if (countOf(db, acc.id, id) < qty) return c.json({ error: 'missing_resources' }, 400);
    const double = Math.random() < game.skillValue(game.SKILLS_BY_ID.get('master_alchemist')!, skills.master_alchemist ?? 0);
    db.exec('BEGIN');
    try {
      takeResources(db, acc.id, recipe.inputs);
      if (!addItem(db, acc.id, { templateId: recipe.output, itemLevel: 1, rarity: 'common', upgrade: 0, qty: double ? 2 : 1 }, clock.now())) {
        db.exec('ROLLBACK');
        return c.json({ error: 'inventory_full' }, 400);
      }
      db.prepare('UPDATE accounts SET gold = gold - ? WHERE id = ?').run(price, acc.id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    addReport(db, acc.id, 'alchemy', `${f.name} ${double ? '2 adet ' : ''}${game.template(recipe.output)!.name} kaynattı`, { recipe: recipe.id, qty: double ? 2 : 1 }, clock.now());
    return c.json({ qty: double ? 2 : 1 });
  });
}
