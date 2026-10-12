import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { LEGAL_VERSIONS } from '../src/accounts/routes';
import type { Db } from '../src/db/database';
import { openDatabase } from '../src/db/database';
import { MemoryMailer } from '../src/lib/mailer';
import { deleteAccount } from '../src/accounts/repo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const legal = { acceptTerms: true, privacyNoticeAck: true, ageConfirmed: true, termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy };
const H = 3_600_000;

function world() {
  let t = Date.UTC(2026, 9, 13, 10);
  const clock = { now: () => t, advance: (ms: number) => (t += ms) };
  const db = openDatabase(':memory:');
  const mailer = new MemoryMailer();
  const app = createApp({ db, mailer, now: clock.now, rateLimitPerMinute: 100_000 });
  const req = (path: string, method = 'GET', body?: unknown, token?: string) =>
    app.request(path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const player = async (email: string, cls = 'swordmaster') => {
    await req('/v1/auth/register', 'POST', { email, password: 'cok-gizli-sifre', ...legal });
    const code = /(\d{6})/.exec(mailer.sent.at(-1)!.text)![1];
    const token = (await read(await req('/v1/auth/verify', 'POST', { email, code }))).token as string;
    const f = await read(await req('/v1/fighters', 'POST', { name: 'Kara Demir', class: cls }, token));
    const accountId = (db.prepare('SELECT id FROM accounts WHERE email = ?').get(email) as { id: string }).id;
    db.prepare('UPDATE accounts SET gold = 5000 WHERE id = ?').run(accountId);
    return {
      accountId, fighterId: f.id as string,
      get: async (p: string) => read(await req(p, 'GET', undefined, token)),
      post: async (p: string, b: unknown = {}) => read(await req(p, 'POST', b, token)),
      del: async (p: string) => req(p, 'DELETE', undefined, token),
    };
  };
  return { db, clock, player };
}

const gold = (db: Db, id: string) => (db.prepare('SELECT gold FROM accounts WHERE id = ?').get(id) as { gold: number }).gold;

describe('keşif', () => {
  it('sends a party for a chosen time, returns with finds and gives scouts the edge', async () => {
    const w = world();
    const p = await w.player('k@example.com', 'scout');
    expect((await p.post('/v1/game/explorations', { fighterIds: [p.fighterId], travelMs: H / 4, exploreMs: 0 })).error).toBe('invalid_time');
    const r = await p.post('/v1/game/explorations', { fighterIds: [p.fighterId], travelMs: H, exploreMs: 6 * H });
    expect(r.endsAt - w.clock.now()).toBe(8 * H);
    let s = await p.get('/v1/game/state');
    expect(s.fighters[0].status).toBe('exploration');
    expect(s.explorations[0].arriveAt - s.explorations[0].startedAt).toBe(H);
    expect((await p.post('/v1/game/explorations', { fighterIds: [p.fighterId], travelMs: H, exploreMs: 0 })).error).toBe('fighter_busy');
    const before = gold(w.db, p.accountId);
    w.clock.advance(8 * H);
    s = await p.get('/v1/game/state');
    expect(s.explorations).toHaveLength(0);
    expect(gold(w.db, p.accountId)).toBeGreaterThan(before);
    const rep = (await p.get('/v1/game/reports')).reports.find((x: { kind: string }) => x.kind === 'exploration');
    expect(rep.body.finds.length).toBeGreaterThanOrEqual(2);
  });

  it('recall turns the party around without rewards', async () => {
    const w = world();
    const p = await w.player('r@example.com');
    const r = await p.post('/v1/game/explorations', { fighterIds: [p.fighterId], travelMs: 2 * H, exploreMs: 4 * H });
    w.clock.advance(H / 2);
    const back = await p.post(`/v1/game/explorations/${r.id}/recall`);
    expect(back.returnsAt - w.clock.now()).toBe(H / 2);
    w.clock.advance(H / 2);
    const s = await p.get('/v1/game/state');
    expect(s.fighters[0].status).toBe('idle');
  });
});

describe('sancak', () => {
  it('creates, joins, helps, raids together and survives the leader leaving', async () => {
    const w = world();
    const a = await w.player('a@example.com');
    const b = await w.player('b@example.com');
    expect((await a.post('/v1/game/clans', { name: 'Orospu Kurtlar', tag: 'KRT' })).error).toBe('name_blocked');
    const { id } = await a.post('/v1/game/clans', { name: 'Demir Kurtlar', tag: 'DKR', color: 2, symbol: 3 });
    expect(id).toBeTruthy();
    expect(gold(w.db, a.accountId)).toBe(4500);
    expect((await b.post('/v1/game/clans', { name: 'demir  kurtlar', tag: 'XYZ' })).error).toBe('clan_taken');
    expect((await b.post(`/v1/game/clans/${id}/join`)).joined).toBe(true);
    expect((await b.get('/v1/game/state')).clan.tag).toBe('DKR');

    // help: b speeds up a's expedition by 5%, once
    const exp = await a.post('/v1/game/expeditions', { zoneId: 'dark_forest', fighterIds: [a.fighterId] });
    const left = exp.endsAt - w.clock.now();
    const view = await b.get('/v1/game/clan');
    expect(view.helps).toHaveLength(1);
    expect((await b.post('/v1/game/clan/help', { all: true })).helped).toBe(1);
    expect((await b.post('/v1/game/clan/help', { kind: 'expedition', id: exp.id })).error).toBe('nothing_to_help');
    expect((await a.post('/v1/game/clan/help', { kind: 'expedition', id: exp.id })).error).toBe('nothing_to_help'); // not yourself
    const after = (await a.get('/v1/game/state')).expeditions[0].endsAt - w.clock.now();
    expect(after).toBe(Math.round(left * 0.95));
    w.clock.advance(left);

    // raid: members hit the boss until it falls; both get a report
    expect((await b.post('/v1/game/clan/raid', { bossId: 'wolf_king' })).error).toBe('forbidden');
    expect((await a.post('/v1/game/clan/raid', { bossId: 'stone_golem' })).error).toBe('boss_locked');
    await a.post('/v1/game/clan/raid', { bossId: 'wolf_king' });
    w.db.prepare('UPDATE clan_raids SET hp = 300').run();
    let won = false;
    for (let i = 0; i < 20 && !won; i++) {
      w.db.prepare('UPDATE fighters SET hp_ratio = 1, raid_ready_at = NULL, status_kind = \'idle\'').run();
      const hitA = await a.post('/v1/game/clan/raid/attack', { fighterId: a.fighterId });
      expect(hitA.damage).toBeGreaterThan(0);
      if (hitA.won) won = true;
      else won = (await b.post('/v1/game/clan/raid/attack', { fighterId: b.fighterId })).won;
    }
    expect(won).toBe(true);
    expect((await a.post('/v1/game/clan/raid/attack', { fighterId: a.fighterId })).error).toBe('no_raid');
    const rb = (await b.get('/v1/game/reports')).reports.find((x: { kind: string }) => x.kind === 'raid');
    expect(rb.body.won).toBe(true);
    expect(rb.body.gold).toBeGreaterThan(0);
    expect((await a.get('/v1/game/clan')).clan.xp).toBeGreaterThanOrEqual(80);

    // b cannot fight a in the arena (same banner)
    const arena = await b.get('/v1/game/arena');
    expect(arena.players.some((x: { owner: string }) => x)).toBe(false);

    // leader deletes the account → b leads; b leaves → banner dissolves
    deleteAccount(w.db, a.accountId);
    expect((await b.get('/v1/game/clan')).me.role).toBe('leader');
    await b.post('/v1/game/clan/leave');
    expect(w.db.prepare('SELECT COUNT(*) n FROM clans').get()).toEqual({ n: 0 });
    // cooldown before joining another banner
    const c = await w.player('c@example.com');
    const other = await c.post('/v1/game/clans', { name: 'Kuzey Yeli', tag: 'KY' });
    expect((await b.post(`/v1/game/clans/${other.id}/join`)).error).toBe('clan_cooldown');
  });

  it('request policy needs an officer to accept', async () => {
    const w = world();
    const a = await w.player('a2@example.com');
    const b = await w.player('b2@example.com');
    const { id } = await a.post('/v1/game/clans', { name: 'Gece Bekçileri', tag: 'GB', policy: 'request' });
    expect((await b.post(`/v1/game/clans/${id}/join`)).requested).toBe(true);
    const v = await a.get('/v1/game/clan');
    expect(v.requests).toHaveLength(1);
    expect((await a.post(`/v1/game/clan/requests/${b.accountId}`, { accept: true })).ok).toBe(true);
    expect((await b.get('/v1/game/clan')).members).toHaveLength(2);
    expect((await b.post(`/v1/game/clan/members/${a.accountId}`, { action: 'kick' })).error).toBe('forbidden');
  });
});
