import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { PvpSnapshot } from '@arena/core';
import { createCharacter, buildSnapshot, createExportPackage, generateLadderToken, newSave } from '@arena/core';
import { createApp } from '../src/app';

const random = (n: number) => new Uint8Array(randomBytes(n));

function snapshot(): PvpSnapshot {
  const r = createCharacter({ name: 'Gizli', origin: 'dockhand', allocation: { strength: 10 } }, { random, now: 0 });
  if (!r.ok) throw new Error();
  return buildSnapshot(newSave(r.value, 0));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const json = (body: unknown, method = 'POST') => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('pvp + ladder', () => {
  it('fights a ghost when the pool is empty, then real opponents', async () => {
    const app = createApp();
    const t1 = generateLadderToken(random);
    const t2 = generateLadderToken(random);

    const r1 = await read(await app.request('/v1/pvp/fight', json({ token: t1, snapshot: snapshot() })));
    expect(r1.opponent.isGhost).toBe(true);
    const r2 = await read(await app.request('/v1/pvp/fight', json({ token: t2, snapshot: snapshot() })));
    expect(r2.opponent.isGhost).toBe(false);
    expect(r2.opponent.displayName).toBe(r1.me.displayName);

    const ladder = await read(await app.request('/v1/ladder'));
    expect(ladder.entries).toHaveLength(2);
    const text = JSON.stringify(ladder);
    expect(text).not.toContain(t1);
    expect(text).not.toContain('Gizli');

    expect((await app.request('/v1/ladder', json({ token: t1 }, 'DELETE'))).status).toBe(204);
    expect((await read(await app.request('/v1/ladder'))).entries).toHaveLength(1);
  });

  it('rejects illegal snapshots and bad tokens', async () => {
    const app = createApp();
    const s = snapshot();
    const res = await app.request('/v1/pvp/fight', json({ token: generateLadderToken(random), snapshot: { ...s, level: 99 } }));
    expect(res.status).toBe(400);
    expect((await app.request('/v1/pvp/fight', json({ token: 'me@example.com', snapshot: s }))).status).toBe(400);
  });

  it('rate limits per client key', async () => {
    const app = createApp({ rateLimitPerMinute: 2 });
    for (let i = 0; i < 2; i++) expect((await app.request('/v1/ladder')).status).toBe(200);
    expect((await app.request('/v1/ladder')).status).toBe(429);
  });
});

describe('transfer relay', () => {
  it('stores an opaque blob once and expires it', async () => {
    let now = 0;
    const app = createApp({ now: () => now });
    const r = createCharacter({ name: 'Gizli', origin: 'courier', allocation: { agility: 10 } }, { random, now: 0 });
    if (!r.ok) throw new Error();
    const pkg = createExportPackage(newSave(r.value, 0), random);

    expect((await app.request(`/v1/transfer/${pkg.lookupId}`, json({ blob: pkg.blob }, 'PUT'))).status).toBe(200);
    const got = await read(await app.request(`/v1/transfer/${pkg.lookupId}`));
    expect(got.blob).toBe(pkg.blob);
    expect((await app.request(`/v1/transfer/${pkg.lookupId}`)).status).toBe(404);

    await app.request(`/v1/transfer/${pkg.lookupId}`, json({ blob: pkg.blob }, 'PUT'));
    now += 73 * 60 * 60 * 1000;
    expect((await app.request(`/v1/transfer/${pkg.lookupId}`)).status).toBe(404);
  });
});
