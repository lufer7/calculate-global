import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { LEGAL_VERSIONS } from '../src/accounts/routes';
import { openDatabase } from '../src/db/database';
import { MemoryMailer } from '../src/lib/mailer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const legal = { acceptTerms: true, privacyNoticeAck: true, ageConfirmed: true, termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy };

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
  it('sefer: attacks a creature at once, spends energy and pays gold/xp', async () => {
    const p = await player();
    const f = await read(await p.post('/v1/fighters', { name: 'Kara Demir', class: 'swordmaster' }));
    p.db.prepare('UPDATE fighters SET level = 8').run();
    const r = await read(await p.post('/v1/game/hunt', { fighterId: f.id, creatureId: 'red_fox' }));
    expect(r.won).toBe(true);
    expect(r.gold).toBeGreaterThan(0);
    expect(r.outcome.log.length).toBeGreaterThan(0);
    expect(r.energy.value).toBe(19);
    let state = await read(await p.get('/v1/game/state'));
    expect(state.account.gold).toBe(200 + r.gold);
    expect(state.fighters[0].energy).toMatchObject({ value: 19, max: 20 });
    expect((await read(await p.post('/v1/game/hunt', { fighterId: f.id, creatureId: 'frogman' }))).error).toBe('zone_locked');
    // energy runs out, then refills 1 point per 7 minutes
    p.db.prepare('UPDATE fighters SET energy = 0, energy_at = ?, hp_ratio = 1').run(p.clock.now());
    expect((await read(await p.post('/v1/game/hunt', { fighterId: f.id, creatureId: 'red_fox' }))).error).toBe('no_energy');
    p.clock.advance(7 * 60_000);
    state = await read(await p.get('/v1/game/state'));
    expect(state.fighters[0].energy.value).toBe(1);
    p.db.prepare('UPDATE fighters SET hp_ratio = 0.1').run();
    expect((await read(await p.post('/v1/game/hunt', { fighterId: f.id, creatureId: 'red_fox' }))).error).toBe('too_weak');
  });

  it('cami heals for free and much faster than idling; waking up early keeps what was healed', async () => {
    const p = await player();
    const f = await read(await p.post('/v1/fighters', { name: 'Kara Demir', class: 'swordmaster' }));
    p.db.prepare('UPDATE fighters SET hp_ratio = 0.2, hp_at = ?').run(p.clock.now());
    const { until } = await read(await p.post('/v1/game/cami/rest', { fighterId: f.id }));
    expect(until - p.clock.now()).toBe(4 * 3_600_000);
    let s = await read(await p.get('/v1/game/state'));
    expect(s.fighters[0].status).toBe('resting');
    expect((await read(await p.post('/v1/game/hunt', { fighterId: f.id, creatureId: 'red_fox' }))).error).toBe('fighter_busy');
    p.clock.advance(3_600_000);
    await read(await p.post('/v1/game/cami/wake', { fighterId: f.id }));
    s = await read(await p.get('/v1/game/state'));
    expect(s.fighters[0].status).toBe('idle');
    expect(s.fighters[0].hpRatio).toBeCloseTo(0.4);
    await p.post('/v1/game/cami/rest', { fighterId: f.id });
    p.clock.advance(5 * 3_600_000);
    s = await read(await p.get('/v1/game/state'));
    expect(s.fighters[0].status).toBe('idle');
    expect(s.fighters[0].hpRatio).toBe(1);
    expect((await read(await p.post('/v1/game/cami/rest', { fighterId: f.id }))).error).toBe('hp_full');
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

  it('runs Rasathane research with seer perk and gold cost', async () => {
    const p = await player();
    await p.post('/v1/fighters', { name: 'Yel', class: 'seer' });
    expect((await read(await p.post('/v1/game/research', { id: 'stamina' }))).error).toBe('research_locked');
    const r = await read(await p.post('/v1/game/research', { id: 'hunters_eye' }));
    expect(r.cost).toBe(100);
    expect((await read(await p.post('/v1/game/research', { id: 'haggling' }))).error).toBe('busy');
    p.clock.advance(r.until - p.clock.now());
    let state = await read(await p.get('/v1/game/state'));
    expect(state.account.research.hunters_eye).toBe(1);
    expect(state.account.activeResearch).toBeNull();
    expect(state.account.gold).toBe(100);
    // Dayanıklılık raises the energy cap once researched
    p.db.prepare(`UPDATE accounts SET research_json = '{"iron_drill":2,"stamina":2,"big_bags":1}'`).run();
    state = await read(await p.get('/v1/game/state'));
    expect(state.fighters[0].energy.max).toBe(24);
    expect(state.bagCapacity).toBe(54);
  });
});
