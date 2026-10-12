import { game } from '@arena/core';
import type { Db } from '../db/database';
import type { Mailer } from '../lib/mailer';
import { deleteAccount } from '../accounts/repo';

const DAY = 86_400_000;

export interface RetentionSummary {
  pendingDeleted: number;
  inactiveWarned: number;
  inactiveDeleted: number;
  sessionsPurged: number;
  codesPurged: number;
  reportsPurged: number;
  notificationsPurged: number;
  auditPurged: number;
  requestsPurged: number;
  expeditionsPurged: number;
}

/**
 * Enforces the storage & destruction periods in game.RETENTION ("Saklama ve İmha Politikası").
 * Runs at server start and every 6 hours; can also be triggered from the admin panel or CLI.
 * Each run is recorded (counts only, no personal data) as proof of periodic destruction.
 */
export async function runRetention(db: Db, mailer: Mailer, now: number): Promise<RetentionSummary> {
  const R = game.RETENTION;
  const s: RetentionSummary = {
    pendingDeleted: 0, inactiveWarned: 0, inactiveDeleted: 0, sessionsPurged: 0, codesPurged: 0,
    reportsPurged: 0, notificationsPurged: 0, auditPurged: 0, requestsPurged: 0, expeditionsPurged: 0,
  };

  // 1. Sign-ups that never verified.
  const pending = db.prepare("SELECT id FROM accounts WHERE status = 'pending' AND created_at < ?").all(now - R.pendingAccountDays * DAY) as { id: string }[];
  for (const a of pending) deleteAccount(db, a.id);
  s.pendingDeleted = pending.length;

  // 2. Inactive accounts: warn first, delete after the grace period if still inactive.
  const lastActive = 'COALESCE(last_login_at, verified_at, created_at)';
  const toWarn = db.prepare(`SELECT id, email FROM accounts WHERE status != 'pending' AND inactivity_warned_at IS NULL AND ${lastActive} < ?`).all(now - R.inactiveWarnDays * DAY) as { id: string; email: string }[];
  for (const a of toWarn) {
    try {
      await mailer.send({
        to: a.email,
        subject: 'Hesabın yakında silinecek',
        text: `Uzun süredir giriş yapmadığın için Toz ve Demir hesabın en erken ${R.warnGraceDays} gün sonra kalıcı olarak silinecek.\nHesabını korumak istiyorsan bu süre içinde oyuna giriş yapman yeterli.`,
      });
      db.prepare('UPDATE accounts SET inactivity_warned_at = ? WHERE id = ?').run(now, a.id);
      s.inactiveWarned++;
    } catch {
      // mail failed: try again next run, never delete without a delivered warning attempt
    }
  }
  const toDelete = db.prepare(`SELECT id FROM accounts WHERE inactivity_warned_at IS NOT NULL AND inactivity_warned_at < ? AND ${lastActive} < ?`).all(now - R.warnGraceDays * DAY, now - R.inactiveDeleteDays * DAY) as { id: string }[];
  for (const a of toDelete) deleteAccount(db, a.id);
  s.inactiveDeleted = toDelete.length;

  // 3. Technical leftovers and logs past their period.
  s.sessionsPurged = Number(db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now).changes);
  s.codesPurged = Number(db.prepare('DELETE FROM verification_codes WHERE expires_at < ?').run(now).changes);
  s.reportsPurged = Number(db.prepare('DELETE FROM reports WHERE at < ?').run(now - R.reportsDays * DAY).changes);
  s.expeditionsPurged = Number(db.prepare("DELETE FROM expeditions WHERE state = 'done' AND ends_at < ?").run(now - R.reportsDays * DAY).changes);
  s.notificationsPurged = Number(db.prepare('DELETE FROM admin_notifications WHERE at < ?').run(now - R.adminNotificationsDays * DAY).changes);
  s.auditPurged = Number(db.prepare('DELETE FROM admin_audit WHERE at < ?').run(now - R.auditDays * DAY).changes);
  s.requestsPurged = Number(db.prepare("DELETE FROM data_requests WHERE status != 'open' AND answered_at < ?").run(now - R.dataRequestsDays * DAY).changes);

  db.prepare('INSERT INTO retention_runs (at, summary) VALUES (?, ?)').run(now, JSON.stringify(s));
  db.prepare('DELETE FROM retention_runs WHERE at < ?').run(now - R.auditDays * DAY);
  return s;
}
