import type { Db } from '../db/database';

export interface ClanRow {
  id: string;
  name: string;
  name_key: string;
  tag: string;
  emblem_color: number;
  emblem_symbol: number;
  join_policy: 'open' | 'request';
  xp: number;
  created_at: number;
}

export interface MemberRow {
  account_id: string;
  clan_id: string;
  role: 'leader' | 'officer' | 'member';
  joined_at: number;
  contribution: number;
}

export const membershipOf = (db: Db, accountId: string) =>
  db.prepare('SELECT * FROM clan_members WHERE account_id = ?').get(accountId) as MemberRow | undefined;

export const clanById = (db: Db, id: string) => db.prepare('SELECT * FROM clans WHERE id = ?').get(id) as ClanRow | undefined;

export function clanLog(db: Db, clanId: string, text: string, at: number) {
  db.prepare('INSERT INTO clan_log (clan_id, text, at) VALUES (?, ?, ?)').run(clanId, text, at);
}

export const nameOf = (db: Db, accountId: string) =>
  (db.prepare('SELECT display_name FROM accounts WHERE id = ?').get(accountId) as { display_name: string } | undefined)?.display_name ?? 'Biri';

/**
 * Removes a member; a leaving leader hands the banner to the longest-serving officer/member,
 * and an empty banner is dissolved. Used by "leave", "kick", account deletion and retention.
 */
export function leaveClanRecord(db: Db, accountId: string, now: number, reason = 'sancaktan ayrıldı') {
  const m = membershipOf(db, accountId);
  if (!m) return;
  const who = nameOf(db, accountId);
  db.prepare('DELETE FROM clan_members WHERE account_id = ?').run(accountId);
  db.prepare('UPDATE accounts SET clan_left_at = ? WHERE id = ?').run(now, accountId);
  const rest = db.prepare("SELECT * FROM clan_members WHERE clan_id = ? ORDER BY CASE role WHEN 'officer' THEN 0 ELSE 1 END, joined_at").all(m.clan_id) as unknown as MemberRow[];
  if (rest.length === 0) {
    db.prepare('DELETE FROM clans WHERE id = ?').run(m.clan_id);
    return;
  }
  clanLog(db, m.clan_id, `${who} ${reason}.`, now);
  if (m.role === 'leader') {
    db.prepare("UPDATE clan_members SET role = 'leader' WHERE account_id = ?").run(rest[0]!.account_id);
    clanLog(db, m.clan_id, `Sancak artık ${nameOf(db, rest[0]!.account_id)} elinde.`, now);
  }
}
