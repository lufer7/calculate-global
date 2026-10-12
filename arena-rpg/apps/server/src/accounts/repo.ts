import type { Db } from '../db/database';

export interface AccountRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  main_class: string | null;
  status: 'pending' | 'active' | 'banned';
  ban_reason: string | null;
  banned_until: number | null;
  created_at: number;
  verified_at: number | null;
  last_login_at: number | null;
  terms_version: string;
  privacy_version: string;
  marketing_consent: number;
  consent_at: number;
}

export interface FighterRow {
  id: string;
  account_id: string;
  name: string;
  class: string;
  level: number;
  xp: number;
  created_at: number;
}

export const accountById = (db: Db, id: string) =>
  db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined;

export const accountByEmail = (db: Db, email: string) =>
  db.prepare('SELECT * FROM accounts WHERE email = ?').get(email) as AccountRow | undefined;

export const fightersOf = (db: Db, accountId: string) =>
  db.prepare('SELECT * FROM fighters WHERE account_id = ? ORDER BY created_at').all(accountId) as unknown as FighterRow[];

/** A timed ban that has run out is lifted lazily on the next access. */
export function effectiveStatus(db: Db, acc: AccountRow, now: number): AccountRow['status'] {
  if (acc.status === 'banned' && acc.banned_until !== null && acc.banned_until <= now) {
    db.prepare("UPDATE accounts SET status = 'active', ban_reason = NULL, banned_until = NULL WHERE id = ?").run(acc.id);
    return 'active';
  }
  return acc.status;
}

export function revokeSessions(db: Db, subjectId: string) {
  db.prepare('DELETE FROM sessions WHERE subject_id = ?').run(subjectId);
}

export function addNotification(db: Db, kind: string, accountId: string | null, text: string, now: number) {
  db.prepare('INSERT INTO admin_notifications (kind, account_id, text, at) VALUES (?, ?, ?, ?)').run(kind, accountId, text, now);
}

export function audit(db: Db, adminId: string, action: string, target: string | null, detail: string | null, now: number) {
  db.prepare('INSERT INTO admin_audit (admin_id, action, target, detail, at) VALUES (?, ?, ?, ?, ?)').run(adminId, action, target, detail, now);
}
