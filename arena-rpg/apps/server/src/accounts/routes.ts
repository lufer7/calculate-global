import { Hono } from 'hono';
import { displayNameFromId, game, isValidName, normalizeName } from '@arena/core';
import type { Db } from '../db/database';
import type { Mailer } from '../lib/mailer';
import { DUMMY_HASH, hashPassword, randomId, sha256, sixDigitCode, verifyPassword } from '../lib/security';
import { playerGuard } from './guard';
import { accountByEmail, accountById, addNotification, deleteAccount, effectiveStatus, fightersOf, logConsent } from './repo';
import { createSession, endSession } from './sessions';
import { giveStarterKit } from '../game/items';

/** Bump in @arena/core when the texts change; players must accept the new version on next login. */
export const LEGAL_VERSIONS = game.LEGAL_VERSIONS;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const CODE_TTL_MS = 15 * 60_000;
const MAX_CODE_ATTEMPTS = 5;

export interface AccountDeps {
  db: Db;
  mailer: Mailer;
  now: () => number;
  /** Called on events the owner wants to hear about. Never receives the player's email. */
  notifyAdmin: (kind: string, accountId: string, text: string) => Promise<void>;
}

export function accountRoutes({ db, mailer, now, notifyAdmin }: AccountDeps) {
  const app = new Hono<{ Variables: { subjectId: string; tokenHash: string } }>();

  async function sendCode(accountId: string, email: string) {
    const code = sixDigitCode();
    db.prepare(
      'INSERT INTO verification_codes (account_id, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0) ' +
        'ON CONFLICT(account_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0',
    ).run(accountId, sha256(`${accountId}:${code}`), now() + CODE_TTL_MS);
    await mailer.send({ to: email, subject: 'Doğrulama kodun', text: `Aegis doğrulama kodun: ${code}\nKod 15 dakika geçerlidir.` });
  }

  /**
   * Registration. Both legal checkboxes are mandatory; marketing is a separate, optional opt-in.
   * The response is identical whether or not the email already exists (no account enumeration).
   */
  app.post('/auth/register', async (c) => {
    const b = await c.req.json().catch(() => null);
    const email = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : '';
    const password = typeof b?.password === 'string' ? b.password : '';
    if (!EMAIL.test(email)) return c.json({ error: 'invalid_email' }, 400);
    if (password.length < 10 || password.length > 200) return c.json({ error: 'weak_password' }, 400);
    if (b.acceptTerms !== true || b.privacyNoticeAck !== true) return c.json({ error: 'legal_acceptance_required' }, 400);
    if (b.ageConfirmed !== true) return c.json({ error: 'age_confirmation_required', minAge: game.MIN_AGE }, 400);
    if (b.termsVersion !== LEGAL_VERSIONS.terms || b.privacyVersion !== LEGAL_VERSIONS.privacy) {
      return c.json({ error: 'outdated_legal_version', current: LEGAL_VERSIONS }, 409);
    }

    const existing = accountByEmail(db, email);
    if (existing) {
      if (existing.status === 'pending') await sendCode(existing.id, email);
      else await mailer.send({ to: email, subject: 'Kayıt denemesi', text: 'Bu e-posta ile zaten bir hesabın var. Sen değilsen bu mesajı yok sayabilirsin.' });
      return c.json({ status: 'verification_sent' }, 202);
    }

    const id = randomId();
    const t = now();
    const marketing = b.marketingConsent === true;
    db.prepare(
      `INSERT INTO accounts (id, email, password_hash, display_name, status, created_at, terms_version, privacy_version, marketing_consent, consent_at, age_confirmed_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
    ).run(id, email, await hashPassword(password), displayNameFromId(id), t, LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy, marketing ? 1 : 0, t, t);
    logConsent(db, id, 'terms', LEGAL_VERSIONS.terms, t);
    logConsent(db, id, 'privacy', LEGAL_VERSIONS.privacy, t);
    logConsent(db, id, 'age', `${game.MIN_AGE}+`, t);
    if (marketing) logConsent(db, id, 'marketing', 'granted', t);
    await sendCode(id, email);
    return c.json({ status: 'verification_sent' }, 202);
  });

  app.post('/auth/verify', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = typeof b?.email === 'string' ? accountByEmail(db, b.email.trim().toLowerCase()) : undefined;
    const row = acc && (db.prepare('SELECT * FROM verification_codes WHERE account_id = ?').get(acc.id) as
      | { code_hash: string; expires_at: number; attempts: number }
      | undefined);
    if (!acc || !row || row.expires_at <= now() || row.attempts >= MAX_CODE_ATTEMPTS) return c.json({ error: 'invalid_code' }, 400);
    if (sha256(`${acc.id}:${String(b.code)}`) !== row.code_hash) {
      db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE account_id = ?').run(acc.id);
      return c.json({ error: 'invalid_code' }, 400);
    }
    db.prepare('DELETE FROM verification_codes WHERE account_id = ?').run(acc.id);
    db.prepare("UPDATE accounts SET status = 'active', verified_at = ? WHERE id = ? AND status = 'pending'").run(now(), acc.id);
    await notifyAdmin('account_verified', acc.id, `Yeni üye: ${acc.display_name}`);
    return c.json({ token: createSession(db, 'player', acc.id, now()) });
  });

  app.post('/auth/login', async (c) => {
    const b = await c.req.json().catch(() => null);
    const email = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : '';
    const password = typeof b?.password === 'string' ? b.password : '';
    const acc = accountByEmail(db, email);
    const okPassword = await verifyPassword(password, acc?.password_hash ?? DUMMY_HASH);
    if (!acc || !okPassword) return c.json({ error: 'invalid_credentials' }, 401);
    const status = effectiveStatus(db, acc, now());
    if (status === 'pending') return c.json({ error: 'not_verified' }, 403);
    if (status === 'banned') return c.json({ error: 'banned', reason: acc.ban_reason, until: acc.banned_until }, 403);
    db.prepare('UPDATE accounts SET last_login_at = ?, inactivity_warned_at = NULL WHERE id = ?').run(now(), acc.id);
    const needsLegal = acc.terms_version !== LEGAL_VERSIONS.terms || acc.privacy_version !== LEGAL_VERSIONS.privacy;
    return c.json({ token: createSession(db, 'player', acc.id, now()), needsLegalAcceptance: needsLegal });
  });

  // Everything below needs a valid session on a non-banned account.
  const guard = playerGuard(db, now);
  for (const path of ['/me', '/me/*', '/fighters', '/account', '/auth/logout']) app.use(path, guard);

  app.post('/auth/logout', (c) => {
    endSession(db, c.get('tokenHash'));
    return c.body(null, 204);
  });

  app.get('/me', (c) => {
    const acc = accountById(db, c.get('subjectId'))!;
    const fighters = fightersOf(db, acc.id);
    const level = game.accountLevel(fighters);
    return c.json({
      id: acc.id,
      email: acc.email,
      displayName: acc.display_name,
      mainClass: acc.main_class,
      mainClassPerk: acc.main_class ? game.MAIN_CLASS_PERKS[acc.main_class as game.ClassId] : null,
      accountLevel: level,
      fighterSlots: game.fighterSlots(level),
      fighters: fighters.map(({ account_id: _, ...f }) => f),
      marketingConsent: acc.marketing_consent === 1,
      needsLegalAcceptance: acc.terms_version !== LEGAL_VERSIONS.terms || acc.privacy_version !== LEGAL_VERSIONS.privacy,
    });
  });

  app.post('/me/legal', async (c) => {
    const b = await c.req.json().catch(() => null);
    if (b?.acceptTerms !== true || b?.privacyNoticeAck !== true) return c.json({ error: 'legal_acceptance_required' }, 400);
    db.prepare('UPDATE accounts SET terms_version = ?, privacy_version = ?, consent_at = ? WHERE id = ?').run(
      LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy, now(), c.get('subjectId'),
    );
    logConsent(db, c.get('subjectId'), 'terms', LEGAL_VERSIONS.terms, now());
    logConsent(db, c.get('subjectId'), 'privacy', LEGAL_VERSIONS.privacy, now());
    return c.body(null, 204);
  });

  app.post('/me/marketing', async (c) => {
    const b = await c.req.json().catch(() => null);
    const granted = b?.consent === true;
    db.prepare('UPDATE accounts SET marketing_consent = ? WHERE id = ?').run(granted ? 1 : 0, c.get('subjectId'));
    logConsent(db, c.get('subjectId'), 'marketing', granted ? 'granted' : 'withdrawn', now());
    return c.body(null, 204);
  });

  /** New fighter. The very first one fixes the account's main class (and its account-wide perks). */
  app.post('/fighters', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    const name = typeof b?.name === 'string' ? normalizeName(b.name) : '';
    if (!isValidName(name)) return c.json({ error: 'invalid_name' }, 400);
    if (!game.isClassId(b?.class)) return c.json({ error: 'invalid_class' }, 400);
    const fighters = fightersOf(db, acc.id);
    if (fighters.length >= game.fighterSlots(game.accountLevel(fighters))) return c.json({ error: 'no_fighter_slot' }, 409);

    const id = randomId();
    db.prepare('INSERT INTO fighters (id, account_id, name, class, created_at, hp_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, acc.id, name, b.class, now(), now());
    giveStarterKit(db, acc.id, id, b.class, now());
    if (!acc.main_class) db.prepare('UPDATE accounts SET main_class = ? WHERE id = ?').run(b.class, acc.id);
    await notifyAdmin('fighter_created', acc.id, `${acc.display_name} yeni dövüşçü oluşturdu: ${name} (${game.CLASSES[b.class as game.ClassId].name})`);
    return c.json({ id, name, class: b.class, level: 1, mainClass: acc.main_class ?? b.class }, 201);
  });

  /** Store requirement: in-app account deletion. Password re-entry prevents deletion via a stolen session. */
  app.delete('/account', async (c) => {
    const b = await c.req.json().catch(() => null);
    const acc = accountById(db, c.get('subjectId'))!;
    if (!(await verifyPassword(typeof b?.password === 'string' ? b.password : '', acc.password_hash))) {
      return c.json({ error: 'invalid_credentials' }, 401);
    }
    deleteAccount(db, acc.id);
    addNotification(db, 'account_deleted', null, `Bir hesap kendini sildi (${acc.display_name})`, now());
    return c.body(null, 204);
  });

  return app;
}
