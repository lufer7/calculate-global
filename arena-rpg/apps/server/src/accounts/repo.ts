import type { Db } from '../db/database';
import { leaveClanRecord } from '../clan/membership';

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
  gold: number;
  research_json: string;
  active_research: string | null;
  age_confirmed_at: number | null;
  inactivity_warned_at: number | null;
  pending_email: string | null;
  clan_left_at: number | null;
  arena_shield_until: number | null;
}

export interface FighterRow {
  id: string;
  account_id: string;
  name: string;
  class: string;
  level: number;
  xp: number;
  created_at: number;
  skills_json: string;
  hp_ratio: number;
  status_kind: 'idle' | 'expedition' | 'exploration' | 'resting' | 'injured' | 'arena';
  status_until: number | null;
  respec_count: number;
  respec_at: number | null;
  hp_at: number | null;
  hunt_at: number | null;
  arena_points: number;
  arena_wins: number;
  arena_losses: number;
  arena_ready_at: number | null;
  arena_roll: number;
  raid_ready_at: number | null;
  energy: number;
  energy_at: number | null;
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

export function logConsent(db: Db, accountId: string, kind: 'terms' | 'privacy' | 'marketing' | 'age', value: string, now: number) {
  db.prepare('INSERT INTO consent_log (account_id, kind, value, at) VALUES (?, ?, ?, ?)').run(accountId, kind, value, now);
}

/** Last activity drives the inactivity clock; written at most once per hour per account. */
export function touchActivity(db: Db, accountId: string, now: number) {
  db.prepare('UPDATE accounts SET last_login_at = ? WHERE id = ? AND (last_login_at IS NULL OR last_login_at < ?)').run(now, accountId, now - 3_600_000);
  // Any activity cancels a pending inactivity warning, so a future deletion always gets a fresh warning.
  db.prepare('UPDATE accounts SET inactivity_warned_at = NULL WHERE id = ? AND inactivity_warned_at IS NOT NULL').run(accountId);
}

/** Full deletion of an account and everything linked to it. */
export function deleteAccount(db: Db, accountId: string) {
  leaveClanRecord(db, accountId, Date.now(), 'hesabını kapattı');
  db.prepare('DELETE FROM sessions WHERE subject_id = ?').run(accountId);
  db.prepare('DELETE FROM admin_notifications WHERE account_id = ?').run(accountId);
  db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId); // fighters, codes, expeditions, reports, consents cascade
}
