import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { LEGAL_VERSIONS } from '../src/accounts/routes';
import { openDatabase } from '../src/db/database';
import { MemoryMailer } from '../src/lib/mailer';
import { hashPassword, newTotpSecret, totpAt } from '../src/lib/security';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const json = (body: unknown, method = 'POST', token?: string) => ({
  method,
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
const auth = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

const legal = { acceptTerms: true, privacyNoticeAck: true, ageConfirmed: true, termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy };

function setup() {
  let t = Date.UTC(2026, 9, 12, 10);
  const clock = { now: () => t, advance: (ms: number) => (t += ms) };
  const db = openDatabase(':memory:');
  const mailer = new MemoryMailer();
  const app = createApp({ db, mailer, now: clock.now, rateLimitPerMinute: 1000, adminNotifyEmail: 'owner@example.com' });
  return { app, db, mailer, clock };
}

async function signUp(ctx: ReturnType<typeof setup>, email = 'oyuncu@example.com', password = 'cok-gizli-sifre') {
  const r = await ctx.app.request('/v1/auth/register', json({ email, password, ...legal }));
  expect(r.status).toBe(202);
  const mail = ctx.mailer.sent.filter((m) => m.to === email).at(-1)!;
  const code = /(\d{6})/.exec(mail.text)![1];
  const v = await read(await ctx.app.request('/v1/auth/verify', json({ email, code })));
  return v.token as string;
}

async function adminLogin(ctx: ReturnType<typeof setup>) {
  const secret = newTotpSecret();
  ctx.db.prepare('INSERT INTO admins (id, email, password_hash, totp_secret, created_at) VALUES (?, ?, ?, ?, ?)').run(
    'adm', 'owner@example.com', await hashPassword('yonetici-sifresi-123'), secret, 0,
  );
  const totp = totpAt(secret, Math.floor(ctx.clock.now() / 30_000));
  const r = await ctx.app.request('/admin/api/login', json({ email: 'owner@example.com', password: 'yonetici-sifresi-123', totp }));
  expect(r.status).toBe(200);
  return { token: (await read(r)).token as string, secret, totp };
}

describe('player accounts', () => {
  it('requires both legal acknowledgements to register', async () => {
    const { app } = setup();
    const r = await app.request('/v1/auth/register', json({ email: 'a@example.com', password: 'cok-gizli-sifre', acceptTerms: true }));
    expect((await read(r)).error).toBe('legal_acceptance_required');
  });

  it('register → verify → login → fighters, first fighter fixes the main class', async () => {
    const ctx = setup();
    const token = await signUp(ctx);
    expect(token).toBeTruthy();
    const login = await read(await ctx.app.request('/v1/auth/login', json({ email: 'OYUNCU@example.com', password: 'cok-gizli-sifre' })));
    expect(login.token).toBeTruthy();

    const f1 = await ctx.app.request('/v1/fighters', json({ name: 'Kara Demir', class: 'scout' }, 'POST', token));
    expect(f1.status).toBe(201);
    const f2 = await ctx.app.request('/v1/fighters', json({ name: 'İkinci', class: 'seer' }, 'POST', token));
    expect((await read(f2)).error).toBe('no_fighter_slot');

    const me = await read(await ctx.app.request('/v1/me', auth(token)));
    expect(me.mainClass).toBe('scout');
    expect(me.mainClassPerk.perks.expeditionRareChanceRelative).toBe(0.3);
    expect(me.fighters).toHaveLength(1);
  });

  it('does not reveal whether an email is registered', async () => {
    const ctx = setup();
    await signUp(ctx);
    const r = await ctx.app.request('/v1/auth/register', json({ email: 'oyuncu@example.com', password: 'baska-bir-sifre', ...legal }));
    expect(r.status).toBe(202);
    expect((await ctx.app.request('/v1/auth/login', json({ email: 'yok@example.com', password: 'x' }))).status).toBe(401);
  });

  it('notifies the owner without the player email', async () => {
    const ctx = setup();
    const token = await signUp(ctx);
    await ctx.app.request('/v1/fighters', json({ name: 'Kara Demir', class: 'seer' }, 'POST', token));
    const ownerMails = ctx.mailer.sent.filter((m) => m.to === 'owner@example.com');
    expect(ownerMails).toHaveLength(2);
    for (const m of ownerMails) expect(m.subject + m.text).not.toContain('oyuncu@example.com');
  });

  it('lets players delete their account with their password', async () => {
    const ctx = setup();
    const token = await signUp(ctx);
    expect((await ctx.app.request('/v1/account', json({ password: 'yanlis' }, 'DELETE', token))).status).toBe(401);
    expect((await ctx.app.request('/v1/account', json({ password: 'cok-gizli-sifre' }, 'DELETE', token))).status).toBe(204);
    expect((await ctx.app.request('/v1/me', auth(token))).status).toBe(401);
  });
});

describe('admin panel', () => {
  it('serves the panel with a strict CSP and can be hidden', async () => {
    const { app } = setup();
    const r = await app.request('/admin');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    const hidden = createApp({ adminAllowed: () => false });
    expect((await hidden.request('/admin')).status).toBe(404);
    expect((await hidden.request('/admin/api/stats')).status).toBe(404);
  });

  it('needs password + TOTP and rejects code replay', async () => {
    const ctx = setup();
    const { totp } = await adminLogin(ctx);
    const again = await ctx.app.request('/admin/api/login', json({ email: 'owner@example.com', password: 'yonetici-sifresi-123', totp }));
    expect(again.status).toBe(401);
    expect((await ctx.app.request('/admin/api/stats')).status).toBe(401);
  });

  it('player tokens never open admin endpoints', async () => {
    const ctx = setup();
    const playerToken = await signUp(ctx);
    expect((await ctx.app.request('/admin/api/stats', auth(playerToken))).status).toBe(401);
  });

  it('lists, inspects, bans, unbans and audits', async () => {
    const ctx = setup();
    const playerToken = await signUp(ctx);
    await ctx.app.request('/v1/fighters', json({ name: 'Kara Demir', class: 'swordmaster' }, 'POST', playerToken));
    const { token } = await adminLogin(ctx);

    const stats = await read(await ctx.app.request('/admin/api/stats', auth(token)));
    expect(stats).toMatchObject({ accounts: 1, active: 1, fighters: 1 });

    const list = await read(await ctx.app.request('/admin/api/players?q=Kara', auth(token)));
    expect(list.players).toHaveLength(1);
    const id = list.players[0].id;

    const detail = await read(await ctx.app.request(`/admin/api/players/${id}`, auth(token)));
    expect(detail.emailMasked).toBe('o***@e******.com');
    expect(JSON.stringify(detail)).not.toContain('oyuncu@example.com');

    expect((await ctx.app.request(`/admin/api/players/${id}/reveal-email`, json({}, 'POST', token))).status).toBe(400);
    const revealed = await read(await ctx.app.request(`/admin/api/players/${id}/reveal-email`, json({ reason: 'Destek talebi #12' }, 'POST', token)));
    expect(revealed.email).toBe('oyuncu@example.com');

    const ban = await read(await ctx.app.request(`/admin/api/players/${id}/ban`, json({ reason: 'Hile', days: 7 }, 'POST', token)));
    expect(ban.status).toBe('banned');
    expect((await ctx.app.request('/v1/me', auth(playerToken))).status).toBe(401); // sessions revoked
    const blocked = await read(await ctx.app.request('/v1/auth/login', json({ email: 'oyuncu@example.com', password: 'cok-gizli-sifre' })));
    expect(blocked).toMatchObject({ error: 'banned', reason: 'Hile' });

    ctx.clock.advance(8 * 86_400_000); // timed ban runs out
    expect((await ctx.app.request('/v1/auth/login', json({ email: 'oyuncu@example.com', password: 'cok-gizli-sifre' }))).status).toBe(200);

    const fighterId = detail.fighters[0].id;
    const { token: token2 } = await adminLogin2(ctx);
    const renamed = await read(await ctx.app.request(`/admin/api/fighters/${fighterId}/rename`, json({ name: 'Uygun Ad' }, 'POST', token2)));
    expect(renamed.name).toBe('Uygun Ad');

    const auditLog = await read(await ctx.app.request('/admin/api/audit', auth(token2)));
    expect(auditLog.entries.map((e: { action: string }) => e.action)).toEqual(
      expect.arrayContaining(['login', 'reveal_email', 'ban', 'rename_fighter']),
    );
    const notes = await read(await ctx.app.request('/admin/api/notifications', auth(token2)));
    expect(notes.notifications.map((n: { kind: string }) => n.kind)).toEqual(['fighter_created', 'account_verified']);
  });

  it('expires idle admin sessions after 30 minutes', async () => {
    const ctx = setup();
    const { token } = await adminLogin(ctx);
    ctx.clock.advance(31 * 60_000);
    expect((await ctx.app.request('/admin/api/stats', auth(token))).status).toBe(401);
  });
});

/** Fresh login for the same admin after the clock moved (idle timeout). */
async function adminLogin2(ctx: ReturnType<typeof setup>) {
  const row = ctx.db.prepare("SELECT totp_secret FROM admins WHERE id = 'adm'").get() as { totp_secret: string };
  const totp = totpAt(row.totp_secret, Math.floor(ctx.clock.now() / 30_000));
  const r = await ctx.app.request('/admin/api/login', json({ email: 'owner@example.com', password: 'yonetici-sifresi-123', totp }));
  return { token: (await read(r)).token as string };
}
