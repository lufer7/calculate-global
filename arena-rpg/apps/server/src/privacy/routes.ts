import { Hono } from 'hono';
import { game } from '@arena/core';
import { playerGuard } from '../accounts/guard';
import { accountByEmail, accountById, addNotification } from '../accounts/repo';
import type { Db } from '../db/database';
import type { Mailer } from '../lib/mailer';
import { hashPassword, randomId, sha256, sixDigitCode, verifyPassword } from '../lib/security';
import { exportAccountData } from './export';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const KINDS = ['access', 'rectification', 'erasure', 'objection', 'other'] as const;
const DAY = 86_400_000;

/** Data-subject rights and account security, all under /v1/me. */
export function privacyRoutes(db: Db, mailer: Mailer, now: () => number) {
  const app = new Hono<{ Variables: { subjectId: string; tokenHash: string } }>();
  app.use('*', playerGuard(db, now));

  // Right of access / portability: the player can download everything at any time, no request needed.
  app.get('/export', (c) => {
    c.header('Content-Disposition', 'attachment; filename="aegis-verilerim.json"');
    return c.json(exportAccountData(db, c.get('subjectId'), now()));
  });

  // Rectification: change email (verified on the new address) and password.
  app.post('/email', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const email = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (!EMAIL.test(email)) return c.json({ error: 'invalid_email' }, 400);
    if (!(await verifyPassword(String(b?.password ?? ''), acc.password_hash))) return c.json({ error: 'invalid_credentials' }, 401);
    if (accountByEmail(db, email)) return c.json({ error: 'email_taken' }, 409);
    const code = sixDigitCode();
    db.prepare('UPDATE accounts SET pending_email = ? WHERE id = ?').run(email, acc.id);
    db.prepare(
      'INSERT INTO verification_codes (account_id, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0) ' +
        'ON CONFLICT(account_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0',
    ).run(acc.id, sha256(`${acc.id}:email:${code}`), now() + 15 * 60_000);
    await mailer.send({ to: email, subject: 'Yeni e-posta adresini doğrula', text: `Aegis e-posta değişikliği kodun: ${code}\nKod 15 dakika geçerlidir.` });
    return c.json({ status: 'verification_sent' }, 202);
  });

  app.post('/email/confirm', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const row = db.prepare('SELECT * FROM verification_codes WHERE account_id = ?').get(acc.id) as { code_hash: string; expires_at: number; attempts: number } | undefined;
    if (!acc.pending_email || !row || row.expires_at <= now() || row.attempts >= 5) return c.json({ error: 'invalid_code' }, 400);
    if (sha256(`${acc.id}:email:${String(b?.code ?? '')}`) !== row.code_hash) {
      db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE account_id = ?').run(acc.id);
      return c.json({ error: 'invalid_code' }, 400);
    }
    if (accountByEmail(db, acc.pending_email)) return c.json({ error: 'email_taken' }, 409);
    db.prepare('UPDATE accounts SET email = pending_email, pending_email = NULL WHERE id = ?').run(acc.id);
    db.prepare('DELETE FROM verification_codes WHERE account_id = ?').run(acc.id);
    await mailer.send({ to: acc.email, subject: 'E-posta adresin değiştirildi', text: 'Aegis hesabının e-posta adresi değiştirildi. Bu işlemi sen yapmadıysan hemen bizimle iletişime geç.' }).catch(() => undefined);
    return c.body(null, 204);
  });

  app.post('/password', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const next = String(b?.next ?? '');
    if (!(await verifyPassword(String(b?.current ?? ''), acc.password_hash))) return c.json({ error: 'invalid_credentials' }, 401);
    if (next.length < 10 || next.length > 200) return c.json({ error: 'weak_password' }, 400);
    db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(await hashPassword(next), acc.id);
    db.prepare('DELETE FROM sessions WHERE subject_id = ? AND token_hash != ?').run(acc.id, c.get('tokenHash'));
    return c.body(null, 204);
  });

  app.post('/sessions/revoke-others', (c) => {
    db.prepare('DELETE FROM sessions WHERE subject_id = ? AND token_hash != ?').run(c.get('subjectId'), c.get('tokenHash'));
    return c.body(null, 204);
  });

  // KVKK md. 11 / 13 applications: tracked with a 30-day legal deadline, answered from the admin panel.
  app.get('/requests', (c) => c.json({
    requests: db.prepare('SELECT id, kind, message, status, created_at, due_at, answered_at, answer FROM data_requests WHERE account_id = ? ORDER BY created_at DESC').all(c.get('subjectId')),
  }));

  app.post('/requests', async (c) => {
    const b = await c.req.json().catch(() => null);
    const kind = String(b?.kind ?? '');
    const message = typeof b?.message === 'string' ? b.message.trim().slice(0, 2000) : '';
    if (!(KINDS as readonly string[]).includes(kind)) return c.json({ error: 'invalid_kind' }, 400);
    if (message.length < 3) return c.json({ error: 'message_required' }, 400);
    const open = (db.prepare("SELECT COUNT(*) n FROM data_requests WHERE account_id = ? AND status = 'open'").get(c.get('subjectId')) as { n: number }).n;
    if (open >= 3) return c.json({ error: 'too_many_open_requests' }, 429);
    const acc = accountById(db, c.get('subjectId'))!;
    const id = randomId();
    const t = now();
    db.prepare('INSERT INTO data_requests (id, account_id, display_name, kind, message, status, created_at, due_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, acc.id, acc.display_name, kind, message, 'open', t, t + game.RETENTION.dataRequestAnswerDays * DAY,
    );
    addNotification(db, 'data_request', acc.id, `KVKK başvurusu (${kind}): ${acc.display_name} — son yanıt tarihi ${new Date(t + game.RETENTION.dataRequestAnswerDays * DAY).toLocaleDateString('tr-TR')}`, t);
    return c.json({ id, dueAt: t + game.RETENTION.dataRequestAnswerDays * DAY }, 201);
  });

  return app;
}

