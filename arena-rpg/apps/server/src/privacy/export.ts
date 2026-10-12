import type { Db } from '../db/database';

/** Everything we hold about one account, in a portable JSON shape (KVKK md. 11 / GDPR art. 15 & 20). */
export function exportAccountData(db: Db, accountId: string, now: number) {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as Record<string, unknown> | undefined;
  if (!account) return null;
  const { password_hash: _pw, ...accountData } = account; // a hash is not useful to the person and must not leave the server
  return {
    exportedAt: new Date(now).toISOString(),
    note: 'Bu dosya Aegis hesabınla ilgili sakladığımız bütün kişisel verileri içerir. Şifren yalnızca geri döndürülemez özet olarak saklandığı için dahil değildir.',
    account: accountData,
    consents: db.prepare('SELECT kind, value, at FROM consent_log WHERE account_id = ? ORDER BY id').all(accountId),
    fighters: db.prepare('SELECT * FROM fighters WHERE account_id = ?').all(accountId),
    expeditions: db.prepare('SELECT * FROM expeditions WHERE account_id = ?').all(accountId),
    explorations: db.prepare('SELECT * FROM explorations WHERE account_id = ?').all(accountId),
    clan: db.prepare('SELECT c.name, c.tag, m.role, m.joined_at, m.contribution FROM clan_members m JOIN clans c ON c.id = m.clan_id WHERE m.account_id = ?').get(accountId) ?? null,
    clanRequests: db.prepare('SELECT c.name, c.tag, r.at FROM clan_requests r JOIN clans c ON c.id = r.clan_id WHERE r.account_id = ?').all(accountId),
    raidHits: db.prepare('SELECT raid_id, fighter_id, damage, at FROM clan_raid_hits WHERE account_id = ?').all(accountId),
    clanHelps: db.prepare('SELECT target_kind, at FROM clan_helps WHERE helper_id = ?').all(accountId),
    reports: db.prepare('SELECT kind, title, body_json, at, read FROM reports WHERE account_id = ?').all(accountId),
    sessions: db.prepare("SELECT created_at, expires_at, last_seen_at FROM sessions WHERE kind = 'player' AND subject_id = ?").all(accountId),
    dataRequests: db.prepare('SELECT kind, message, status, created_at, due_at, answered_at, answer FROM data_requests WHERE account_id = ?').all(accountId),
  };
}
