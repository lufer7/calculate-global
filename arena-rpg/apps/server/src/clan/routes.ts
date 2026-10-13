import { randomBytes } from 'node:crypto';
import type { Hono } from 'hono';
import { createRng, game } from '@arena/core';
import type { FighterRow } from '../accounts/repo';
import { accountById, fightersOf } from '../accounts/repo';
import type { Db } from '../db/database';
import { randomId } from '../lib/security';
import { battlerOf } from '../game/gangRoutes';
import { addItem } from '../game/items';
import type { ExplorationRow, GameClock } from '../game/settle';
import { fxOf, spendEnergy } from '../game/energy';
import { addReport } from '../game/settle';
import type { ClanRow, MemberRow } from './membership';
import { clanById, clanLog, leaveClanRecord, membershipOf, nameOf } from './membership';

type App = Hono<{ Variables: { subjectId: string; tokenHash: string } }>;

interface RaidRow {
  id: string;
  clan_id: string;
  boss_id: string;
  hp: number;
  max_hp: number;
  started_at: number;
  ends_at: number;
  state: 'active' | 'won' | 'expired';
}

const clanCard = (db: Db, c: ClanRow) => {
  const level = game.clanLevel(c.xp);
  const members = (db.prepare('SELECT COUNT(*) n FROM clan_members WHERE clan_id = ?').get(c.id) as { n: number }).n;
  return { id: c.id, name: c.name, tag: c.tag, color: c.emblem_color, symbol: c.emblem_symbol, policy: c.join_policy, level, xp: c.xp, members, maxMembers: game.clanMaxMembers(level) };
};

/** Small summary for /state (header badge, home screen). */
export function clanSummary(db: Db, accountId: string, now: number) {
  const m = membershipOf(db, accountId);
  if (m) settleRaid(db, m.clan_id, now);
  const c = m ? clanById(db, m.clan_id) : undefined;
  return c && m ? { ...clanCard(db, c), role: m.role } : null;
}

/** Lazily closes a raid whose time ran out. */
function settleRaid(db: Db, clanId: string, now: number) {
  const r = db.prepare("SELECT * FROM clan_raids WHERE clan_id = ? AND state = 'active'").get(clanId) as RaidRow | undefined;
  if (!r || r.ends_at > now) return;
  const boss = game.RAID_BOSSES_BY_ID.get(r.boss_id);
  db.prepare("UPDATE clan_raids SET state = 'expired' WHERE id = ?").run(r.id);
  clanLog(db, clanId, `${boss?.name ?? 'Canavar'} yenilemedi ve kaçtı.`, r.ends_at);
  const who = db.prepare('SELECT DISTINCT account_id FROM clan_raid_hits WHERE raid_id = ? AND account_id IS NOT NULL').all(r.id) as { account_id: string }[];
  for (const w of who) addReport(db, w.account_id, 'raid', `Sancak avı: ${boss?.name ?? 'Canavar'} kaçtı`, { bossId: r.boss_id, won: false, hp: r.hp, maxHp: r.max_hp }, r.ends_at);
}

/** The killing blow: everyone who hit the boss shares the gold and gets a roll on its loot table. */
function winRaid(db: Db, r: RaidRow, now: number) {
  const boss = game.RAID_BOSSES_BY_ID.get(r.boss_id)!;
  db.prepare("UPDATE clan_raids SET state = 'won', hp = 0 WHERE id = ?").run(r.id);
  db.prepare('UPDATE clans SET xp = xp + ? WHERE id = ?').run(boss.clanXp, r.clan_id);
  const rows = db.prepare('SELECT account_id, SUM(damage) dmg FROM clan_raid_hits WHERE raid_id = ? AND account_id IS NOT NULL GROUP BY account_id ORDER BY dmg DESC').all(r.id) as { account_id: string; dmg: number }[];
  const total = rows.reduce((s, x) => s + x.dmg, 0);
  rows.forEach((x, i) => {
    const gold = game.raidGold(boss, x.dmg, total, rows.length);
    db.prepare('UPDATE accounts SET gold = gold + ? WHERE id = ?').run(gold, x.account_id);
    const level = fightersOf(db, x.account_id).reduce((m, f) => Math.max(m, f.level), 1);
    const rng = createRng(game.seedFrom(r.id, x.account_id));
    const item = game.rollEquipment(rng, level, game.rollRarity(rng, boss.rarity));
    const kept = addItem(db, x.account_id, item, now) !== null;
    addReport(db, x.account_id, 'raid', `Sancak avı: ${boss.name} yenildi!`, {
      bossId: boss.id, won: true, damage: x.dmg, share: Math.round((x.dmg / Math.max(1, total)) * 100), rank: i + 1, participants: rows.length, gold,
      items: [{ name: game.itemName(item), rarity: item.rarity, icon: game.template(item.templateId)?.icon, qty: 1, kept }],
    }, now);
  });
  clanLog(db, r.clan_id, `${boss.name} yenildi! ${rows.length} kişi ganimeti paylaştı, sancak +${boss.clanXp} şan kazandı.`, now);
}

/** Things a banner mate is waiting for that I can speed up. */
function helpTargets(db: Db, clanId: string, me: string, now: number) {
  const mates = db.prepare('SELECT account_id FROM clan_members WHERE clan_id = ? AND account_id != ?').all(clanId, me) as { account_id: string }[];
  const out: { kind: 'research' | 'exploration'; id: string; owner: string; label: string; endsAt: number; helps: number; helped: boolean }[] = [];
  const helpInfo = (kind: string, id: string) => {
    const n = (db.prepare('SELECT COUNT(*) n FROM clan_helps WHERE target_kind = ? AND target_id = ?').get(kind, id) as { n: number }).n;
    const mine = !!db.prepare('SELECT 1 FROM clan_helps WHERE target_kind = ? AND target_id = ? AND helper_id = ?').get(kind, id, me);
    return { helps: n, helped: mine };
  };
  for (const { account_id } of mates) {
    const acc = accountById(db, account_id);
    if (!acc) continue;
    const owner = acc.display_name;
    if (acc.active_research) {
      const r = JSON.parse(acc.active_research) as { id: string; level: number; until: number };
      if (r.until > now) out.push({ kind: 'research', id: researchKey(account_id, r), owner, label: `${game.RESEARCH[r.id]?.name ?? 'Araştırma'} Sv ${r.level}`, endsAt: r.until, ...helpInfo('research', researchKey(account_id, r)) });
    }
    for (const t of db.prepare("SELECT * FROM explorations WHERE account_id = ? AND state = 'active' AND ends_at > ?").all(account_id, now) as unknown as ExplorationRow[]) {
      out.push({ kind: 'exploration', id: t.id, owner, label: 'Keşif', endsAt: t.ends_at, ...helpInfo('exploration', t.id) });
    }
  }
  return out.sort((a, b) => Number(a.helped) - Number(b.helped) || a.endsAt - b.endsAt);
}

const researchKey = (accountId: string, r: { id: string; level: number }) => `${accountId}:${r.id}:${r.level}`;

/** Applies one help: cuts 5% of what is left. Returns false when the target is gone. */
function applyHelp(db: Db, clanId: string, helperId: string, kind: string, id: string, now: number): boolean {
  const cut = (until: number) => now + Math.round((until - now) * (1 - game.CLAN.helpCut));
  // only banner mates, never yourself
  const inClan = (accountId: string) => accountId !== helperId && membershipOf(db, accountId)?.clan_id === clanId;
  if (kind === 'research') {
    const accountId = id.split(':')[0]!;
    const acc = accountById(db, accountId);
    if (!acc?.active_research || !inClan(accountId)) return false;
    const r = JSON.parse(acc.active_research) as { id: string; level: number; until: number };
    if (researchKey(accountId, r) !== id || r.until <= now) return false;
    db.prepare('UPDATE accounts SET active_research = ? WHERE id = ?').run(JSON.stringify({ ...r, until: cut(r.until) }), accountId);
    return true;
  }
  const table = kind === 'exploration' ? 'explorations' : null;
  if (!table) return false;
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND state = 'active' AND ends_at > ?`).get(id, now) as { account_id: string; ends_at: number; fighter_ids: string } | undefined;
  if (!row || !inClan(row.account_id)) return false;
  const until = cut(row.ends_at);
  db.prepare(`UPDATE ${table} SET ends_at = ? WHERE id = ?`).run(until, id);
  for (const fid of JSON.parse(row.fighter_ids) as string[]) db.prepare('UPDATE fighters SET status_until = ? WHERE id = ? AND status_until = ?').run(until, fid, row.ends_at);
  return true;
}

export function registerClanRoutes(app: App, db: Db, clock: GameClock) {
  const myMember = (c: { get: (k: 'subjectId') => string }) => membershipOf(db, c.get('subjectId'));
  const tx = <T>(fn: () => T): T => {
    db.exec('BEGIN');
    try {
      const v = fn();
      db.exec('COMMIT');
      return v;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
  const canManage = (m: MemberRow) => m.role === 'leader' || m.role === 'officer';
  const joinBlocked = (accountId: string, now: number) => {
    const acc = accountById(db, accountId)!;
    return acc.clan_left_at !== null && acc.clan_left_at + Math.round(game.CLAN.rejoinCooldownMs / clock.speed) > now ? acc.clan_left_at + Math.round(game.CLAN.rejoinCooldownMs / clock.speed) : null;
  };
  const addMember = (clanId: string, accountId: string, role: MemberRow['role'], now: number) => {
    db.prepare('INSERT INTO clan_members (account_id, clan_id, role, joined_at) VALUES (?, ?, ?, ?)').run(accountId, clanId, role, now);
    db.prepare('DELETE FROM clan_requests WHERE account_id = ?').run(accountId);
  };

  app.get('/clans', (c) => {
    const q = game.clanNameKey(String(c.req.query('q') ?? ''));
    const me = c.get('subjectId');
    const rows = db.prepare('SELECT * FROM clans ORDER BY xp DESC, created_at LIMIT 200').all() as unknown as ClanRow[];
    const requested = new Set((db.prepare('SELECT clan_id FROM clan_requests WHERE account_id = ?').all(me) as { clan_id: string }[]).map((r) => r.clan_id));
    const list = rows.filter((r) => !q || r.name_key.includes(q) || game.clanNameKey(r.tag).includes(q)).slice(0, 30).map((r) => ({ ...clanCard(db, r), requested: requested.has(r.id) }));
    return c.json({ clans: list, createCost: game.CLAN.createCost, joinBlockedUntil: joinBlocked(me, clock.now()) });
  });

  app.post('/clans', async (c) => {
    const b = await c.req.json().catch(() => null);
    const me = c.get('subjectId');
    const acc = accountById(db, me)!;
    if (myMember(c)) return c.json({ error: 'already_in_clan' }, 400);
    const name = game.normalizeClanName(String(b?.name ?? ''));
    const tag = String(b?.tag ?? '').trim().toLocaleUpperCase('tr-TR');
    const bad = game.validateClanName(name) ?? game.validateClanTag(tag);
    if (bad) return c.json({ error: bad }, 400);
    if (db.prepare('SELECT 1 FROM clans WHERE name_key = ? OR tag = ?').get(game.clanNameKey(name), tag)) return c.json({ error: 'clan_taken' }, 409);
    if (acc.gold < game.CLAN.createCost) return c.json({ error: 'not_enough_gold', cost: game.CLAN.createCost }, 400);
    const color = Math.max(0, Math.min(game.EMBLEM_COLORS.length - 1, Number(b?.color) || 0));
    const symbol = Math.max(0, Math.min(game.EMBLEM_SYMBOLS.length - 1, Number(b?.symbol) || 0));
    const policy = b?.policy === 'request' ? 'request' : 'open';
    const now = clock.now();
    const id = randomId();
    tx(() => {
      db.prepare('UPDATE accounts SET gold = gold - ? WHERE id = ?').run(game.CLAN.createCost, me);
      db.prepare('INSERT INTO clans (id, name, name_key, tag, emblem_color, emblem_symbol, join_policy, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, game.clanNameKey(name), tag, color, symbol, policy, now);
      addMember(id, me, 'leader', now);
      clanLog(db, id, `${acc.display_name} sancağı dikti.`, now);
    });
    return c.json({ id }, 201);
  });

  app.post('/clans/:id/join', (c) => {
    const me = c.get('subjectId');
    if (myMember(c)) return c.json({ error: 'already_in_clan' }, 400);
    const clan = clanById(db, c.req.param('id'));
    if (!clan) return c.json({ error: 'not_found' }, 404);
    const now = clock.now();
    const blocked = joinBlocked(me, now);
    if (blocked) return c.json({ error: 'clan_cooldown', until: blocked }, 400);
    const card = clanCard(db, clan);
    if (card.members >= card.maxMembers) return c.json({ error: 'clan_full' }, 400);
    if (clan.join_policy === 'request') {
      db.prepare('INSERT OR IGNORE INTO clan_requests (account_id, clan_id, at) VALUES (?, ?, ?)').run(me, clan.id, now);
      return c.json({ requested: true });
    }
    tx(() => {
      addMember(clan.id, me, 'member', now);
      clanLog(db, clan.id, `${nameOf(db, me)} sancağa katıldı.`, now);
    });
    return c.json({ joined: true });
  });

  app.delete('/clans/:id/request', (c) => {
    db.prepare('DELETE FROM clan_requests WHERE account_id = ? AND clan_id = ?').run(c.get('subjectId'), c.req.param('id'));
    return c.body(null, 204);
  });

  app.get('/clan', (c) => {
    const me = c.get('subjectId');
    const m = myMember(c);
    if (!m) return c.json({ clan: null });
    const now = clock.now();
    settleRaid(db, m.clan_id, now);
    const clan = clanById(db, m.clan_id)!;
    const card = clanCard(db, clan);
    const members = (db.prepare('SELECT m.*, a.display_name FROM clan_members m JOIN accounts a ON a.id = m.account_id WHERE m.clan_id = ? ORDER BY CASE m.role WHEN \'leader\' THEN 0 WHEN \'officer\' THEN 1 ELSE 2 END, m.contribution DESC').all(clan.id) as unknown as (MemberRow & { display_name: string })[])
      .map((x) => {
        const fs = fightersOf(db, x.account_id);
        const top = [...fs].sort((a, b) => b.level - a.level)[0];
        return { accountId: x.account_id, name: x.display_name, role: x.role, contribution: x.contribution, joinedAt: x.joined_at, fighters: fs.length, top: top ? { name: top.name, class: top.class, level: top.level } : null, me: x.account_id === me };
      });
    const raid = db.prepare('SELECT * FROM clan_raids WHERE clan_id = ? ORDER BY started_at DESC LIMIT 1').get(clan.id) as RaidRow | undefined;
    const raidHits = raid
      ? (db.prepare('SELECT h.account_id, a.display_name, SUM(h.damage) dmg, COUNT(*) hits FROM clan_raid_hits h LEFT JOIN accounts a ON a.id = h.account_id WHERE raid_id = ? GROUP BY h.account_id ORDER BY dmg DESC').all(raid.id) as { account_id: string | null; display_name: string | null; dmg: number; hits: number }[])
      : [];
    const requests = canManage(m)
      ? (db.prepare('SELECT r.account_id, r.at, a.display_name FROM clan_requests r JOIN accounts a ON a.id = r.account_id WHERE r.clan_id = ? ORDER BY r.at').all(clan.id) as { account_id: string; at: number; display_name: string }[])
        .map((r) => {
          const top = fightersOf(db, r.account_id).sort((a, b) => b.level - a.level)[0];
          return { accountId: r.account_id, name: r.display_name, at: r.at, topLevel: top?.level ?? 1 };
        })
      : [];
    const myFighters = fightersOf(db, me).map((f) => ({ id: f.id, raidReadyAt: f.raid_ready_at }));
    return c.json({
      clan: { ...card, nextLevelXp: card.level >= game.CLAN.maxLevel ? null : game.clanXpForLevel(card.level + 1), levelXp: game.clanXpForLevel(card.level), goldBonus: game.clanGoldBonus(card.level) },
      me: { role: m.role, contribution: m.contribution },
      members,
      requests,
      raid: raid ? { id: raid.id, bossId: raid.boss_id, hp: raid.hp, maxHp: raid.max_hp, startedAt: raid.started_at, endsAt: raid.ends_at, state: raid.state, hits: raidHits.map((h) => ({ name: h.display_name ?? 'Ayrılmış üye', damage: h.dmg, hits: h.hits, me: h.account_id === me })) } : null,
      bosses: game.RAID_BOSSES.map((bs) => ({ id: bs.id, name: bs.name, level: bs.level, hp: bs.hp, clanLevel: bs.clanLevel, gold: bs.gold, unlocked: card.level >= bs.clanLevel })),
      myFighters,
      helps: helpTargets(db, clan.id, me, now),
      log: db.prepare('SELECT text, at FROM clan_log WHERE clan_id = ? ORDER BY id DESC LIMIT 30').all(clan.id),
      rules: { raidCooldownMs: Math.round(game.CLAN.raidCooldownMs / clock.speed), raidMinHp: game.CLAN.raidMinHp, helpCut: game.CLAN.helpCut, maxHelps: game.CLAN.maxHelpsPerTarget, donationGoldPerXp: game.CLAN.donationGoldPerXp },
    });
  });

  app.post('/clan/leave', (c) => {
    if (!myMember(c)) return c.json({ error: 'not_in_clan' }, 400);
    tx(() => leaveClanRecord(db, c.get('subjectId'), clock.now()));
    return c.json({ ok: true });
  });

  app.post('/clan/members/:accountId', async (c) => {
    const b = await c.req.json().catch(() => null);
    const m = myMember(c);
    const target = membershipOf(db, c.req.param('accountId'));
    if (!m || !target || target.clan_id !== m.clan_id || target.account_id === m.account_id) return c.json({ error: 'not_found' }, 404);
    const now = clock.now();
    const action = String(b?.action ?? '');
    if (action === 'kick') {
      if (!canManage(m) || target.role === 'leader' || (m.role === 'officer' && target.role === 'officer')) return c.json({ error: 'forbidden' }, 403);
      tx(() => leaveClanRecord(db, target.account_id, now, `${nameOf(db, m.account_id)} tarafından sancaktan çıkarıldı`));
      return c.json({ ok: true });
    }
    if (m.role !== 'leader') return c.json({ error: 'forbidden' }, 403);
    if (action === 'promote' || action === 'demote') {
      const role = action === 'promote' ? 'officer' : 'member';
      db.prepare('UPDATE clan_members SET role = ? WHERE account_id = ?').run(role, target.account_id);
      clanLog(db, m.clan_id, `${nameOf(db, target.account_id)} artık ${role === 'officer' ? 'subay' : 'er'}.`, now);
      return c.json({ ok: true });
    }
    if (action === 'transfer') {
      tx(() => {
        db.prepare("UPDATE clan_members SET role = 'officer' WHERE account_id = ?").run(m.account_id);
        db.prepare("UPDATE clan_members SET role = 'leader' WHERE account_id = ?").run(target.account_id);
        clanLog(db, m.clan_id, `Sancak artık ${nameOf(db, target.account_id)} elinde.`, now);
      });
      return c.json({ ok: true });
    }
    return c.json({ error: 'invalid_action' }, 400);
  });

  app.post('/clan/requests/:accountId', async (c) => {
    const b = await c.req.json().catch(() => null);
    const m = myMember(c);
    if (!m || !canManage(m)) return c.json({ error: 'forbidden' }, 403);
    const id = c.req.param('accountId');
    const req = db.prepare('SELECT * FROM clan_requests WHERE account_id = ? AND clan_id = ?').get(id, m.clan_id);
    if (!req) return c.json({ error: 'not_found' }, 404);
    const now = clock.now();
    if (b?.accept !== true) {
      db.prepare('DELETE FROM clan_requests WHERE account_id = ? AND clan_id = ?').run(id, m.clan_id);
      return c.json({ ok: true });
    }
    if (membershipOf(db, id)) {
      db.prepare('DELETE FROM clan_requests WHERE account_id = ?').run(id);
      return c.json({ error: 'already_in_clan' }, 400);
    }
    const card = clanCard(db, clanById(db, m.clan_id)!);
    if (card.members >= card.maxMembers) return c.json({ error: 'clan_full' }, 400);
    tx(() => {
      addMember(m.clan_id, id, 'member', now);
      clanLog(db, m.clan_id, `${nameOf(db, id)} sancağa kabul edildi.`, now);
    });
    return c.json({ ok: true });
  });

  app.post('/clan/settings', async (c) => {
    const b = await c.req.json().catch(() => null);
    const m = myMember(c);
    if (!m || m.role !== 'leader') return c.json({ error: 'forbidden' }, 403);
    const clan = clanById(db, m.clan_id)!;
    const color = b?.color === undefined ? clan.emblem_color : Math.max(0, Math.min(game.EMBLEM_COLORS.length - 1, Number(b.color) || 0));
    const symbol = b?.symbol === undefined ? clan.emblem_symbol : Math.max(0, Math.min(game.EMBLEM_SYMBOLS.length - 1, Number(b.symbol) || 0));
    const policy = b?.policy === 'request' || b?.policy === 'open' ? b.policy : clan.join_policy;
    db.prepare('UPDATE clans SET emblem_color = ?, emblem_symbol = ?, join_policy = ? WHERE id = ?').run(color, symbol, policy, clan.id);
    return c.json({ ok: true });
  });

  app.post('/clan/donate', async (c) => {
    const b = await c.req.json().catch(() => null);
    const m = myMember(c);
    if (!m) return c.json({ error: 'not_in_clan' }, 400);
    const gold = Math.floor(Number(b?.gold));
    const per = game.CLAN.donationGoldPerXp;
    if (!Number.isFinite(gold) || gold < per || gold % per !== 0) return c.json({ error: 'invalid_amount' }, 400);
    const acc = accountById(db, m.account_id)!;
    if (acc.gold < gold) return c.json({ error: 'not_enough_gold' }, 400);
    const xp = gold / per;
    const now = clock.now();
    tx(() => {
      db.prepare('UPDATE accounts SET gold = gold - ? WHERE id = ?').run(gold, acc.id);
      db.prepare('UPDATE clans SET xp = xp + ? WHERE id = ?').run(xp, m.clan_id);
      db.prepare('UPDATE clan_members SET contribution = contribution + ? WHERE account_id = ?').run(xp, acc.id);
      clanLog(db, m.clan_id, `${acc.display_name} hazineye ${gold} altın bağışladı (+${xp} şan).`, now);
    });
    return c.json({ xp });
  });

  app.post('/clan/raid', async (c) => {
    const b = await c.req.json().catch(() => null);
    const m = myMember(c);
    if (!m || !canManage(m)) return c.json({ error: 'forbidden' }, 403);
    const now = clock.now();
    settleRaid(db, m.clan_id, now);
    if (db.prepare("SELECT 1 FROM clan_raids WHERE clan_id = ? AND state = 'active'").get(m.clan_id)) return c.json({ error: 'raid_active' }, 400);
    const boss = game.RAID_BOSSES_BY_ID.get(String(b?.bossId ?? ''));
    if (!boss) return c.json({ error: 'not_found' }, 404);
    if (game.clanLevel(clanById(db, m.clan_id)!.xp) < boss.clanLevel) return c.json({ error: 'boss_locked' }, 400);
    const id = randomId();
    db.prepare("INSERT INTO clan_raids (id, clan_id, boss_id, hp, max_hp, started_at, ends_at, state) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')")
      .run(id, m.clan_id, boss.id, boss.hp, boss.hp, now, now + Math.round(game.CLAN.raidDurationMs / clock.speed));
    clanLog(db, m.clan_id, `${nameOf(db, m.account_id)} ${boss.name} avını başlattı. 24 saat içinde yenilmeli!`, now);
    return c.json({ id }, 201);
  });

  app.post('/clan/raid/attack', async (c) => {
    const b = await c.req.json().catch(() => null);
    const m = myMember(c);
    if (!m) return c.json({ error: 'not_in_clan' }, 400);
    const now = clock.now();
    settleRaid(db, m.clan_id, now);
    const raid = db.prepare("SELECT * FROM clan_raids WHERE clan_id = ? AND state = 'active'").get(m.clan_id) as RaidRow | undefined;
    if (!raid) return c.json({ error: 'no_raid' }, 400);
    const f = db.prepare('SELECT * FROM fighters WHERE id = ? AND account_id = ?').get(String(b?.fighterId ?? ''), m.account_id) as FighterRow | undefined;
    if (!f) return c.json({ error: 'not_found' }, 404);
    if (f.status_kind !== 'idle') return c.json({ error: 'fighter_busy' }, 400);
    if (f.raid_ready_at && f.raid_ready_at > now) return c.json({ error: 'raid_cooldown', readyAt: f.raid_ready_at }, 400);
    if (f.hp_ratio < game.CLAN.raidMinHp) return c.json({ error: 'too_weak' }, 400);
    if (!spendEnergy(db, f, fxOf(accountById(db, m.account_id)!), clock, game.ENERGY.fightCost)) return c.json({ error: 'no_energy' }, 400);
    const boss = game.RAID_BOSSES_BY_ID.get(raid.boss_id)!;
    const hit = game.raidHit(battlerOf(db, f), boss, randomBytes(4).readUInt32LE(0));
    const damage = Math.min(raid.hp, hit.damage);
    const readyAt = now + Math.round(game.CLAN.raidCooldownMs / clock.speed);
    const won = tx(() => {
      db.prepare('UPDATE fighters SET hp_ratio = ?, hp_at = ?, raid_ready_at = ? WHERE id = ?').run(Math.min(f.hp_ratio, hit.hpRatio), now, readyAt, f.id);
      db.prepare('INSERT INTO clan_raid_hits (raid_id, account_id, fighter_id, damage, at) VALUES (?, ?, ?, ?, ?)').run(raid.id, m.account_id, f.id, damage, now);
      db.prepare('UPDATE clan_raids SET hp = hp - ? WHERE id = ?').run(damage, raid.id);
      db.prepare('UPDATE clan_members SET contribution = contribution + ? WHERE account_id = ?').run(Math.max(1, Math.round(damage / 100)), m.account_id);
      if (raid.hp - damage <= 0) {
        winRaid(db, { ...raid, hp: 0 }, now);
        return true;
      }
      return false;
    });
    return c.json({ damage, rounds: hit.rounds, hpRatio: Math.min(f.hp_ratio, hit.hpRatio), bossHp: Math.max(0, raid.hp - damage), maxHp: raid.max_hp, won, readyAt });
  });

  app.post('/clan/help', async (c) => {
    const b = await c.req.json().catch(() => null);
    const m = myMember(c);
    if (!m) return c.json({ error: 'not_in_clan' }, 400);
    const now = clock.now();
    const wanted = b?.all === true
      ? helpTargets(db, m.clan_id, m.account_id, now).filter((t) => !t.helped && t.helps < game.CLAN.maxHelpsPerTarget)
      : [{ kind: String(b?.kind ?? ''), id: String(b?.id ?? '') }];
    let done = 0;
    tx(() => {
      for (const t of wanted) {
        const n = (db.prepare('SELECT COUNT(*) n FROM clan_helps WHERE target_kind = ? AND target_id = ?').get(t.kind, t.id) as { n: number }).n;
        if (n >= game.CLAN.maxHelpsPerTarget) continue;
        if (db.prepare('SELECT 1 FROM clan_helps WHERE target_kind = ? AND target_id = ? AND helper_id = ?').get(t.kind, t.id, m.account_id)) continue;
        if (!applyHelp(db, m.clan_id, m.account_id, t.kind, t.id, now)) continue;
        db.prepare('INSERT INTO clan_helps (target_kind, target_id, helper_id, at) VALUES (?, ?, ?, ?)').run(t.kind, t.id, m.account_id, now);
        done++;
      }
      if (done > 0) {
        db.prepare('UPDATE clans SET xp = xp + ? WHERE id = ?').run(done * game.CLAN.helpXp, m.clan_id);
        db.prepare('UPDATE clan_members SET contribution = contribution + ? WHERE account_id = ?').run(done * game.CLAN.helpXp, m.account_id);
      }
    });
    if (done === 0) return c.json({ error: 'nothing_to_help' }, 400);
    return c.json({ helped: done });
  });
}
