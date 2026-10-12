import { Hono } from 'hono';
import { game, isValidName, normalizeName } from '@arena/core';
import type { AccountRow, FighterRow } from '../accounts/repo';
import { accountById, audit, deleteAccount, effectiveStatus, fightersOf, revokeSessions } from '../accounts/repo';
import { createSession, endSession, requireSession } from '../accounts/sessions';
import type { Db } from '../db/database';
import type { Mailer } from '../lib/mailer';
import { DUMMY_HASH, maskEmail, verifyPassword, verifyTotp } from '../lib/security';
import { exportAccountData } from '../privacy/export';
import { runRetention } from '../privacy/retention';

export interface AdminDeps {
  db: Db;
  now: () => number;
  mailer: Mailer;
}

interface AdminRow {
  id: string;
  email: string;
  password_hash: string;
  totp_secret: string;
  last_totp_step: number;
}

/**
 * Owner-only admin API. Separate identities from players, password + TOTP on every login,
 * 30-minute idle timeout, every action written to an audit log. Player emails are masked
 * unless explicitly revealed (which is itself audited).
 */
export function adminRoutes({ db, now, mailer }: AdminDeps) {
  const app = new Hono<{ Variables: { subjectId: string; tokenHash: string } }>();

  app.post('/login', async (c) => {
    const b = await c.req.json().catch(() => null);
    const email = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : '';
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email) as AdminRow | undefined;
    const passOk = await verifyPassword(typeof b?.password === 'string' ? b.password : '', admin?.password_hash ?? DUMMY_HASH);
    const step = admin && passOk ? verifyTotp(admin.totp_secret, String(b?.totp ?? ''), now(), admin.last_totp_step) : null;
    if (!admin || !passOk || step === null) return c.json({ error: 'invalid_credentials' }, 401);
    db.prepare('UPDATE admins SET last_totp_step = ? WHERE id = ?').run(step, admin.id);
    audit(db, admin.id, 'login', null, null, now());
    return c.json({ token: createSession(db, 'admin', admin.id, now()) });
  });

  app.use('/*', async (c, next) => {
    if (c.req.path.endsWith('/login')) return next();
    return requireSession(db, 'admin', now)(c, next);
  });

  const log = (c: { get: (k: 'subjectId') => string }, action: string, target: string | null, detail: string | null = null) =>
    audit(db, c.get('subjectId'), action, target, detail, now());

  app.post('/logout', (c) => {
    log(c, 'logout', null);
    endSession(db, c.get('tokenHash'));
    return c.body(null, 204);
  });

  app.get('/stats', (c) => {
    const startOfDay = new Date(now());
    startOfDay.setUTCHours(0, 0, 0, 0);
    const one = (sql: string, ...args: (string | number)[]) => (db.prepare(sql).get(...args) as { n: number }).n;
    return c.json({
      accounts: one('SELECT COUNT(*) n FROM accounts'),
      active: one("SELECT COUNT(*) n FROM accounts WHERE status = 'active'"),
      pending: one("SELECT COUNT(*) n FROM accounts WHERE status = 'pending'"),
      banned: one("SELECT COUNT(*) n FROM accounts WHERE status = 'banned'"),
      signupsToday: one('SELECT COUNT(*) n FROM accounts WHERE created_at >= ?', startOfDay.getTime()),
      fighters: one('SELECT COUNT(*) n FROM fighters'),
      unreadNotifications: one('SELECT COUNT(*) n FROM admin_notifications WHERE read = 0'),
      byMainClass: db.prepare('SELECT main_class AS cls, COUNT(*) n FROM accounts WHERE main_class IS NOT NULL GROUP BY main_class').all(),
    });
  });

  /** Search by generated name, account id or fighter name. Exact email search is allowed but audited. */
  app.get('/players', (c) => {
    const q = (c.req.query('q') ?? '').trim();
    const status = c.req.query('status');
    const offset = Math.max(0, Number(c.req.query('offset')) || 0);
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (q.includes('@')) {
      where.push('a.email = ?');
      args.push(q.toLowerCase());
      log(c, 'search_by_email', null);
    } else if (q) {
      where.push('(a.display_name LIKE ? OR a.id = ? OR EXISTS (SELECT 1 FROM fighters f2 WHERE f2.account_id = a.id AND f2.name LIKE ?))');
      args.push(`%${q}%`, q, `%${q}%`);
    }
    if (status === 'active' || status === 'pending' || status === 'banned') {
      where.push('a.status = ?');
      args.push(status);
    }
    const rows = db
      .prepare(
        `SELECT a.id, a.display_name, a.status, a.main_class, a.created_at, a.last_login_at, a.banned_until,
                COUNT(f.id) AS fighter_count, COALESCE(MAX(f.level), 0) AS max_level
         FROM accounts a LEFT JOIN fighters f ON f.account_id = a.id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         GROUP BY a.id ORDER BY a.created_at DESC LIMIT 50 OFFSET ?`,
      )
      .all(...args, offset);
    return c.json({ players: rows, offset });
  });

  app.get('/players/:id', (c) => {
    const acc = accountById(db, c.req.param('id'));
    if (!acc) return c.json({ error: 'not_found' }, 404);
    effectiveStatus(db, acc, now());
    return c.json({ ...publicAccount(accountById(db, acc.id)!), fighters: fightersOf(db, acc.id) });
  });

  app.post('/players/:id/reveal-email', async (c) => {
    const b = await c.req.json().catch(() => null);
    const reason = typeof b?.reason === 'string' ? b.reason.trim().slice(0, 200) : '';
    const acc = accountById(db, c.req.param('id'));
    if (!acc) return c.json({ error: 'not_found' }, 404);
    if (reason.length < 3) return c.json({ error: 'reason_required' }, 400);
    log(c, 'reveal_email', acc.id, reason);
    return c.json({ email: acc.email });
  });

  app.post('/players/:id/ban', async (c) => {
    const b = await c.req.json().catch(() => null);
    const reason = typeof b?.reason === 'string' ? b.reason.trim().slice(0, 200) : '';
    const days = b?.days === null || b?.days === undefined ? null : Number(b.days);
    if (reason.length < 3) return c.json({ error: 'reason_required' }, 400);
    if (days !== null && (!Number.isFinite(days) || days <= 0 || days > 3650)) return c.json({ error: 'invalid_days' }, 400);
    const acc = accountById(db, c.req.param('id'));
    if (!acc) return c.json({ error: 'not_found' }, 404);
    const until = days === null ? null : now() + Math.round(days * 86_400_000);
    db.prepare("UPDATE accounts SET status = 'banned', ban_reason = ?, banned_until = ? WHERE id = ?").run(reason, until, acc.id);
    revokeSessions(db, acc.id);
    log(c, 'ban', acc.id, `${reason}${days === null ? ' (kalıcı)' : ` (${days} gün)`}`);
    return c.json(publicAccount(accountById(db, acc.id)!));
  });

  app.post('/players/:id/unban', (c) => {
    const acc = accountById(db, c.req.param('id'));
    if (!acc) return c.json({ error: 'not_found' }, 404);
    db.prepare("UPDATE accounts SET status = CASE WHEN verified_at IS NULL THEN 'pending' ELSE 'active' END, ban_reason = NULL, banned_until = NULL WHERE id = ?").run(acc.id);
    log(c, 'unban', acc.id);
    return c.json(publicAccount(accountById(db, acc.id)!));
  });

  /** Moderation of player-typed fighter names (the only player-typed text in the game). */
  app.post('/fighters/:id/rename', async (c) => {
    const b = await c.req.json().catch(() => null);
    const name = typeof b?.name === 'string' ? normalizeName(b.name) : '';
    if (!isValidName(name)) return c.json({ error: 'invalid_name' }, 400);
    const f = db.prepare('SELECT * FROM fighters WHERE id = ?').get(c.req.param('id')) as FighterRow | undefined;
    if (!f) return c.json({ error: 'not_found' }, 404);
    db.prepare('UPDATE fighters SET name = ? WHERE id = ?').run(name, f.id);
    log(c, 'rename_fighter', f.account_id, `${f.name} → ${name}`);
    return c.json({ ...f, name });
  });

  app.delete('/players/:id', async (c) => {
    const b = await c.req.json().catch(() => null);
    const reason = typeof b?.reason === 'string' ? b.reason.trim().slice(0, 200) : '';
    if (reason.length < 3) return c.json({ error: 'reason_required' }, 400);
    const acc = accountById(db, c.req.param('id'));
    if (!acc) return c.json({ error: 'not_found' }, 404);
    deleteAccount(db, acc.id);
    log(c, 'delete_account', acc.id, reason);
    return c.body(null, 204);
  });

  /** Copy of everything held about a player, e.g. to answer an access request. Audited. */
  app.get('/players/:id/export', (c) => {
    const data = exportAccountData(db, c.req.param('id'), now());
    if (!data) return c.json({ error: 'not_found' }, 404);
    log(c, 'export_data', c.req.param('id'));
    return c.json(data);
  });

  // ---- KVKK applications (md. 11 / 13): 30-day deadline ----
  app.get('/requests', (c) => {
    const status = c.req.query('status');
    const rows = db
      .prepare(`SELECT * FROM data_requests ${status ? 'WHERE status = ?' : ''} ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, due_at`)
      .all(...(status ? [status] : []));
    return c.json({ requests: rows });
  });

  app.post('/requests/:id/answer', async (c) => {
    const b = await c.req.json().catch(() => null);
    const status = b?.status === 'rejected' ? 'rejected' : 'answered';
    const answer = typeof b?.answer === 'string' ? b.answer.trim().slice(0, 4000) : '';
    if (answer.length < 3) return c.json({ error: 'answer_required' }, 400);
    const req = db.prepare('SELECT * FROM data_requests WHERE id = ?').get(c.req.param('id')) as { id: string; account_id: string | null } | undefined;
    if (!req) return c.json({ error: 'not_found' }, 404);
    db.prepare('UPDATE data_requests SET status = ?, answer = ?, answered_at = ? WHERE id = ?').run(status, answer, now(), req.id);
    log(c, 'answer_request', req.account_id, status);
    const acc = req.account_id ? accountById(db, req.account_id) : undefined;
    if (acc) {
      await mailer.send({ to: acc.email, subject: 'KVKK başvurun yanıtlandı', text: 'Başvurunun yanıtı oyunda Hesap > KVKK başvurularım bölümünde.' }).catch(() => undefined);
    }
    return c.json({ id: req.id, status });
  });

  // ---- Storage & destruction ----
  app.get('/retention', (c) => c.json({ runs: db.prepare('SELECT * FROM retention_runs ORDER BY id DESC LIMIT 20').all() }));
  app.post('/retention/run', async (c) => {
    const summary = await runRetention(db, mailer, now());
    log(c, 'run_retention', null, JSON.stringify(summary));
    return c.json(summary);
  });

  app.get('/notifications', (c) =>
    c.json({ notifications: db.prepare('SELECT * FROM admin_notifications ORDER BY id DESC LIMIT 100').all() }),
  );

  app.post('/notifications/read', (c) => {
    db.prepare('UPDATE admin_notifications SET read = 1 WHERE read = 0').run();
    return c.body(null, 204);
  });

  app.get('/audit', (c) => c.json({ entries: db.prepare('SELECT * FROM admin_audit ORDER BY id DESC LIMIT 200').all() }));

  return app;
}

function publicAccount(a: AccountRow) {
  return {
    id: a.id,
    emailMasked: maskEmail(a.email),
    displayName: a.display_name,
    mainClass: a.main_class,
    status: a.status,
    banReason: a.ban_reason,
    bannedUntil: a.banned_until,
    createdAt: a.created_at,
    verifiedAt: a.verified_at,
    lastLoginAt: a.last_login_at,
    termsVersion: a.terms_version,
    privacyVersion: a.privacy_version,
    marketingConsent: a.marketing_consent === 1,
    consentAt: a.consent_at,
  };
}
