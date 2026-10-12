import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { LEGAL_VERSIONS } from '../src/accounts/routes';
import { openDatabase } from '../src/db/database';
import { MemoryMailer } from '../src/lib/mailer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const legal = { acceptTerms: true, privacyNoticeAck: true, termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy };

async function player() {
  let t = Date.UTC(2026, 9, 12, 10);
  const clock = { now: () => t, advance: (ms: number) => (t += ms) };
  const db = openDatabase(':memory:');
  const mailer = new MemoryMailer();
  const app = createApp({ db, mailer, now: clock.now, rateLimitPerMinute: 10_000 });
  const post = (path: string, body: unknown, token?: string) =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  await post('/v1/auth/register', { email: 'p@example.com', password: 'cok-gizli-sifre', ...legal });
  const code = /(\d{6})/.exec(mailer.sent.at(-1)!.text)![1];
  const token = (await read(await post('/v1/auth/verify', { email: 'p@example.com', code }))).token as string;
  const get = (path: string) => app.request(path, { headers: { authorization: `Bearer ${token}` } });
  return { app, db, clock, token, get, post: (p: string, b: unknown) => post(p, b, token) };
}

describe('game API', () => {
  it('sends an expedition, settles it lazily and writes a report', async () => {
    const p = await player();
    const f = await read(await p.post('/v1/fighters', { name: 'Kara Demir', class: 'scout' }));
    const start = await p.post('/v1/game/expeditions', { zoneId: 'dark_forest', fighterIds: [f.id] });
    expect(start.status).toBe(201);
    const { endsAt } = await read(start);

    let state = await read(await p.get('/v1/game/state'));
    expect(state.fighters[0].status).toBe('expedition');
    expect(state.expeditions).toHaveLength(1);
    // Scout main class: 30 min base −20% perk.
    expect(endsAt - p.clock.now()).toBe(24 * 60_000);
    expect((await read(await p.post('/v1/game/expeditions', { zoneId: 'dark_forest', fighterIds: [f.id] }))).error).toBe('fighter_busy');

    p.clock.advance(24 * 60_000);
    state = await read(await p.get('/v1/game/state'));
    expect(state.expeditions).toHaveLength(0);
    expect(state.unreadReports).toBe(1);
    expect(state.fighters[0].xp + state.fighters[0].level).toBeGreaterThan(1);
    const reports = await read(await p.get('/v1/game/reports'));
    expect(reports.reports[0].body.zoneId).toBe('dark_forest');
    expect(reports.reports[0].body.seed).toEqual(expect.any(Number));
  });

  it('recall brings fighters back after the elapsed time with no reward', async () => {
    const p = await player();
    const f = await read(await p.post('/v1/fighters', { name: 'Kara Demir', class: 'swordmaster' }));
    const { id } = await read(await p.post('/v1/game/expeditions', { zoneId: 'dark_forest', fighterIds: [f.id] }));
    p.clock.advance(5 * 60_000);
    const { returnsAt } = await read(await p.post(`/v1/game/expeditions/${id}/recall`, {}));
    expect(returnsAt - p.clock.now()).toBe(5 * 60_000);
    p.clock.advance(5 * 60_000);
    const state = await read(await p.get('/v1/game/state'));
    expect(state.fighters[0].status).toBe('idle');
    expect(state.account.gold).toBe(200);
  });

  it('spends skill points server-side with all rules', async () => {
    const p = await player();
    const f = await read(await p.post('/v1/fighters', { name: 'Kara Demir', class: 'seer' }));
    expect((await read(await p.post(`/v1/game/fighters/${f.id}/skills`, { skillId: 'fireball' }))).error).toBe('not_enough_points');
    p.db.prepare('UPDATE fighters SET level = 5 WHERE id = ?').run(f.id);
    expect((await read(await p.post(`/v1/game/fighters/${f.id}/skills`, { skillId: 'fireball' }))).skills).toEqual({ fireball: 1 });
    expect((await read(await p.post(`/v1/game/fighters/${f.id}/skills`, { skillId: 'heavy_blow' }))).error).toBe('wrong_class');
    expect((await read(await p.post(`/v1/game/fighters/${f.id}/respec`, {}))).skills).toEqual({});
    expect((await read(await p.post(`/v1/game/fighters/${f.id}/respec`, {}))).error).toBe('cooldown');
  });

  it('runs Kafa Kazanı research with seer perk and gold cost', async () => {
    const p = await player();
    await p.post('/v1/fighters', { name: 'Yel', class: 'seer' });
    const r = await read(await p.post('/v1/game/research', { id: 'expedition_logistics' }));
    expect(r.cost).toBe(100);
    expect((await read(await p.post('/v1/game/research', { id: 'expedition_logistics' }))).error).toBe('busy');
    p.clock.advance(r.until - p.clock.now());
    const state = await read(await p.get('/v1/game/state'));
    expect(state.account.research.expedition_logistics).toBe(1);
    expect(state.account.activeResearch).toBeNull();
    expect(state.account.gold).toBe(100);
  });
});
