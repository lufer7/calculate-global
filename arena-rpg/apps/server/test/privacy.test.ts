import { describe, expect, it } from 'vitest';
import { game } from '@arena/core';
import { createApp } from '../src/app';
import { LEGAL_VERSIONS } from '../src/accounts/routes';
import { openDatabase } from '../src/db/database';
import { MemoryMailer } from '../src/lib/mailer';
import { hashPassword, newTotpSecret, totpAt } from '../src/lib/security';
import { runRetention } from '../src/privacy/retention';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const DAY = 86_400_000;
const legal = { acceptTerms: true, privacyNoticeAck: true, ageConfirmed: true, termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy };

function setup() {
  let t = Date.UTC(2026, 9, 13, 10);
  const clock = { now: () => t, advance: (ms: number) => (t += ms) };
  const db = openDatabase(':memory:');
  const mailer = new MemoryMailer();
  const app = createApp({ db, mailer, now: clock.now, rateLimitPerMinute: 10_000 });
  const req = (path: string, method = 'GET', body?: unknown, token?: string) =>
    app.request(path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const lastCode = () => /(\d{6})/.exec(mailer.sent.at(-1)!.text)![1]!;
  async function signUp(email = 'p@example.com', extra: Record<string, unknown> = {}) {
    await req('/v1/auth/register', 'POST', { email, password: 'cok-gizli-sifre', ...legal, ...extra });
    return (await read(await req('/v1/auth/verify', 'POST', { email, code: lastCode() }))).token as string;
  }
  return { app, db, mailer, clock, req, lastCode, signUp };
}

describe('KVKK: consent and age', () => {
  it('requires the age confirmation and logs every consent', async () => {
    const ctx = setup();
    const r = await ctx.req('/v1/auth/register', 'POST', { email: 'a@example.com', password: 'cok-gizli-sifre', ...legal, ageConfirmed: false });
    expect((await read(r)).error).toBe('age_confirmation_required');
    const token = await ctx.signUp('p@example.com', { marketingConsent: true });
    await ctx.req('/v1/me/marketing', 'POST', { consent: false }, token);
    const data = await read(await ctx.req('/v1/me/export', 'GET', undefined, token));
    expect(data.consents.map((c: { kind: string; value: string }) => `${c.kind}:${c.value}`)).toEqual([
      `terms:${LEGAL_VERSIONS.terms}`, `privacy:${LEGAL_VERSIONS.privacy}`, `age:${game.MIN_AGE}+`, 'marketing:granted', 'marketing:withdrawn',
    ]);
  });
});

describe('KVKK md. 11 rights', () => {
  it('exports all data without the password hash', async () => {
    const ctx = setup();
    const token = await ctx.signUp();
    await ctx.req('/v1/fighters', 'POST', { name: 'Kara Demir', class: 'scout' }, token);
    const data = await read(await ctx.req('/v1/me/export', 'GET', undefined, token));
    expect(data.account.email).toBe('p@example.com');
    expect(data.account).not.toHaveProperty('password_hash');
    expect(data.fighters).toHaveLength(1);
  });

  it('changes email only after verifying the new address', async () => {
    const ctx = setup();
    const token = await ctx.signUp();
    expect((await ctx.req('/v1/me/email', 'POST', { email: 'new@example.com', password: 'yanlis' }, token)).status).toBe(401);
    expect((await ctx.req('/v1/me/email', 'POST', { email: 'new@example.com', password: 'cok-gizli-sifre' }, token)).status).toBe(202);
    expect(ctx.mailer.sent.at(-1)!.to).toBe('new@example.com');
    expect((await ctx.req('/v1/me/email/confirm', 'POST', { code: ctx.lastCode() }, token)).status).toBe(204);
    expect(ctx.mailer.sent.at(-1)!.to).toBe('p@example.com'); // notice to the old address
    expect((await read(await ctx.req('/v1/me', 'GET', undefined, token))).email).toBe('new@example.com');
  });

  it('password change logs out other devices', async () => {
    const ctx = setup();
    const t1 = await ctx.signUp();
    const t2 = (await read(await ctx.req('/v1/auth/login', 'POST', { email: 'p@example.com', password: 'cok-gizli-sifre' }))).token;
    expect((await ctx.req('/v1/me/password', 'POST', { current: 'cok-gizli-sifre', next: 'yepyeni-sifre-123' }, t1)).status).toBe(204);
    expect((await ctx.req('/v1/me', 'GET', undefined, t2)).status).toBe(401);
    expect((await ctx.req('/v1/me', 'GET', undefined, t1)).status).toBe(200);
  });

  it('tracks applications with a 30-day deadline and admin answers', async () => {
    const ctx = setup();
    const token = await ctx.signUp();
    const r = await read(await ctx.req('/v1/me/requests', 'POST', { kind: 'access', message: 'Hangi verilerimi işliyorsunuz?' }, token));
    expect(r.dueAt - ctx.clock.now()).toBe(30 * DAY);

    const secret = newTotpSecret();
    ctx.db.prepare('INSERT INTO admins (id, email, password_hash, totp_secret, created_at) VALUES (?, ?, ?, ?, ?)').run('adm', 'o@example.com', await hashPassword('yonetici-sifresi-123'), secret, 0);
    const admin = (await read(await ctx.req('/admin/api/login', 'POST', { email: 'o@example.com', password: 'yonetici-sifresi-123', totp: totpAt(secret, Math.floor(ctx.clock.now() / 30_000)) }))).token;
    const list = await read(await ctx.req('/admin/api/requests', 'GET', undefined, admin));
    expect(list.requests[0]).toMatchObject({ kind: 'access', status: 'open' });
    await ctx.req(`/admin/api/requests/${r.id}/answer`, 'POST', { status: 'answered', answer: 'Verilerinizin kopyası Hesap > Verilerimi indir bölümünde.' }, admin);
    const mine = await read(await ctx.req('/v1/me/requests', 'GET', undefined, token));
    expect(mine.requests[0]).toMatchObject({ status: 'answered' });
    expect(ctx.mailer.sent.at(-1)!.subject).toBe('KVKK başvurun yanıtlandı');
  });
});

describe('storage & destruction (retention job)', () => {
  it('deletes unverified sign-ups after 7 days', async () => {
    const ctx = setup();
    await ctx.req('/v1/auth/register', 'POST', { email: 'q@example.com', password: 'cok-gizli-sifre', ...legal });
    ctx.clock.advance(8 * DAY);
    const s = await runRetention(ctx.db, ctx.mailer, ctx.clock.now());
    expect(s.pendingDeleted).toBe(1);
    expect(ctx.db.prepare('SELECT COUNT(*) n FROM accounts').get()).toEqual({ n: 0 });
  });

  it('warns inactive accounts, deletes them only after the grace period, and activity cancels it', async () => {
    const ctx = setup();
    await ctx.signUp('keep@example.com');
    await ctx.signUp('gone@example.com');
    ctx.clock.advance(701 * DAY);
    let s = await runRetention(ctx.db, ctx.mailer, ctx.clock.now());
    expect(s.inactiveWarned).toBe(2);
    expect(ctx.mailer.sent.filter((m) => m.subject === 'Hesabın yakında silinecek')).toHaveLength(2);

    // The player comes back (old session has expired, so they log in again).
    const back = (await read(await ctx.req('/v1/auth/login', 'POST', { email: 'keep@example.com', password: 'cok-gizli-sifre' }))).token;
    await ctx.req('/v1/me', 'GET', undefined, back);
    ctx.clock.advance(31 * DAY);
    s = await runRetention(ctx.db, ctx.mailer, ctx.clock.now());
    expect(s.inactiveDeleted).toBe(1);
    const left = ctx.db.prepare('SELECT email FROM accounts').all() as { email: string }[];
    expect(left.map((a) => a.email)).toEqual(['keep@example.com']);
    const warned = ctx.db.prepare("SELECT inactivity_warned_at w FROM accounts WHERE email = 'keep@example.com'").get() as { w: number | null };
    expect(warned.w).toBeNull();
  });

  it('purges old reports and records each run', async () => {
    const ctx = setup();
    const token = await ctx.signUp();
    const f = await read(await ctx.req('/v1/fighters', 'POST', { name: 'Kara Demir', class: 'scout' }, token));
    await ctx.req('/v1/game/explorations', 'POST', { fighterIds: [f.id], travelMs: 1_800_000, exploreMs: 0 }, token);
    ctx.clock.advance(DAY);
    await ctx.req('/v1/game/state', 'GET', undefined, token);
    ctx.clock.advance(91 * DAY);
    const s = await runRetention(ctx.db, ctx.mailer, ctx.clock.now());
    expect(s.reportsPurged).toBe(1);
    expect((ctx.db.prepare('SELECT COUNT(*) n FROM retention_runs').get() as { n: number }).n).toBe(1);
  });
});
