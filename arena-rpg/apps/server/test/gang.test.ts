import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { LEGAL_VERSIONS } from '../src/accounts/routes';
import { openDatabase } from '../src/db/database';
import { MemoryMailer } from '../src/lib/mailer';
import { addItem } from '../src/game/items';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const legal = { acceptTerms: true, privacyNoticeAck: true, ageConfirmed: true, termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy };

async function gang(cls = 'swordmaster') {
  let t = Date.UTC(2026, 9, 13, 10);
  const clock = { now: () => t, advance: (ms: number) => (t += ms) };
  const db = openDatabase(':memory:');
  const mailer = new MemoryMailer();
  const app = createApp({ db, mailer, now: clock.now, rateLimitPerMinute: 100_000 });
  const req = (path: string, method = 'GET', body?: unknown, token?: string) =>
    app.request(path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  await req('/v1/auth/register', 'POST', { email: 'g@example.com', password: 'cok-gizli-sifre', ...legal });
  const code = /(\d{6})/.exec(mailer.sent.at(-1)!.text)![1];
  const token = (await read(await req('/v1/auth/verify', 'POST', { email: 'g@example.com', code }))).token as string;
  const f = await read(await req('/v1/fighters', 'POST', { name: 'Kara Demir', class: cls }, token));
  const accountId = (db.prepare('SELECT id FROM accounts').get() as { id: string }).id;
  const get = async (p: string) => read(await req(p, 'GET', undefined, token));
  const post = async (p: string, b: unknown = {}) => read(await req(p, 'POST', b, token));
  return { db, clock, get, post, fighterId: f.id as string, accountId };
}

describe('inventory & paper doll', () => {
  it('gives a starter kit, equips with swap and enforces class', async () => {
    const g = await gang();
    const state = await g.get('/v1/game/state');
    expect(state.fighters[0].equipment.map((i: { equippedSlot: string }) => i.equippedSlot).sort()).toEqual(['chest', 'head', 'main_hand']);
    expect(state.fighters[0].power).toBeGreaterThan(0);

    const axeId = addItem(g.db, g.accountId, { templateId: 'axe', itemLevel: 1, rarity: 'rare', upgrade: 0, qty: 1 }, 0)!;
    const bowId = addItem(g.db, g.accountId, { templateId: 'bow', itemLevel: 1, rarity: 'rare', upgrade: 0, qty: 1 }, 0)!;
    expect((await g.post(`/v1/game/items/${bowId}/equip`, { fighterId: g.fighterId })).error).toBe('wrong_class');
    expect((await g.post(`/v1/game/items/${axeId}/equip`, { fighterId: g.fighterId })).slot).toBe('main_hand');
    const inv = await g.get('/v1/game/inventory');
    const bag = inv.items.filter((i: { fighterId: string | null }) => !i.fighterId).map((i: { templateId: string }) => i.templateId).sort();
    expect(bag).toEqual(['bow', 'bread', 'sword']); // old sword went back to the bag
  });

  it('sells, upgrades at the blacksmith (with swordmaster discount) and eats food', async () => {
    const g = await gang();
    const inv = await g.get('/v1/game/inventory');
    const sword = inv.items.find((i: { templateId: string }) => i.templateId === 'sword');
    const up = await g.post(`/v1/game/items/${sword.id}/upgrade`);
    expect(up.upgrade).toBe(1);
    expect(up.cost).toBe(sword.upgradeCost);
    const bread = inv.items.find((i: { templateId: string }) => i.templateId === 'bread');
    expect((await g.post(`/v1/game/items/${bread.id}/use`, { fighterId: g.fighterId })).error).toBe('hp_full');
    g.db.prepare('UPDATE fighters SET hp_ratio = 0.5').run();
    expect((await g.post(`/v1/game/items/${bread.id}/use`, { fighterId: g.fighterId })).hpRatio).toBeCloseTo(0.7);
    const sold = await g.post(`/v1/game/items/${bread.id}/sell`, { qty: 2 });
    expect(sold.gold).toBe(2);
  });
});

describe('Salı Pazarı', () => {
  it('sells each offer once per hour and refreshes', async () => {
    const g = await gang();
    const m = await g.get('/v1/game/market');
    expect(m.offers.filter((o: { section: string }) => o.section === 'food').length).toBe(4);
    const food = m.offers.filter((o: { section: string }) => o.section === 'food').sort((a: { price: number }, b: { price: number }) => a.price - b.price)[0];
    const r = await g.post('/v1/game/market/buy', { offerId: food.offerId });
    expect(r, JSON.stringify({ r, price: food.price })).toMatchObject({ ok: true });
    expect((await g.post('/v1/game/market/buy', { offerId: food.offerId })).error).toBe('sold_out');
    const pricey = m.offers.find((o: { section: string; price: number }) => o.section === 'potion' && o.price > 200);
    expect((await g.post('/v1/game/market/buy', { offerId: pricey.offerId })).error).toBe('not_enough_gold');
    g.clock.advance(3_600_000);
    const m2 = await g.get('/v1/game/market');
    expect(m2.offers.find((o: { offerId: string }) => o.offerId === food.offerId).soldOut).toBe(false);
  });
});

describe('arena', () => {
  it('fights NPCs, pays rewards, drains HP on loss and enforces cooldown', async () => {
    const g = await gang();
    const a = await g.get(`/v1/game/arena?fighterId=${g.fighterId}`);
    expect(a.npcs).toHaveLength(3);
    const r = await g.post('/v1/game/arena/fight', { fighterId: g.fighterId, opponent: { type: 'npc', id: 'npc0' } });
    expect(r.outcome.log.length).toBeGreaterThan(0);
    expect(r.hpRatio).toBe(r.won ? 1 : 0.85);
    expect((await g.post('/v1/game/arena/fight', { fighterId: g.fighterId, opponent: { type: 'npc', id: 'npc0' } })).error).toBe('arena_cooldown');
    g.clock.advance(11 * 60_000);
    g.db.prepare('UPDATE fighters SET hp_ratio = 0.1').run();
    expect((await g.post('/v1/game/arena/fight', { fighterId: g.fighterId, opponent: { type: 'npc', id: 'npc0' } })).error).toBe('too_weak');
  });
});

describe('hunting, alchemy and potions', () => {
  it('scouts hunt resources over time; seers brew potions from them', async () => {
    const g = await gang('scout');
    g.db.prepare(`UPDATE fighters SET level = 30, skills_json = '{"hunting":3}'`).run();
    await g.get('/v1/game/state'); // starts the hunting clock
    g.clock.advance(2 * 3_600_000);
    await g.get('/v1/game/state');
    const inv = await g.get('/v1/game/inventory');
    const resources = inv.items.filter((i: { kind: string }) => i.kind === 'resource').reduce((s: number, i: { qty: number }) => s + i.qty, 0);
    expect(resources).toBe(6);

    g.db.prepare(`INSERT INTO fighters (id, account_id, name, class, level, created_at, skills_json) VALUES ('seer1', ?, 'Yel', 'seer', 10, 0, '{"potion_making":1}')`).run(g.accountId);
    addItem(g.db, g.accountId, { templateId: 'game_meat', itemLevel: 1, rarity: 'common', upgrade: 0, qty: 2 }, 0);
    addItem(g.db, g.accountId, { templateId: 'bone', itemLevel: 1, rarity: 'common', upgrade: 0, qty: 1 }, 0);
    const brew = await g.post('/v1/game/alchemy/craft', { fighterId: 'seer1', recipeId: 'heal' });
    expect(brew.qty).toBeGreaterThanOrEqual(1);
    expect((await g.post('/v1/game/alchemy/craft', { fighterId: 'seer1', recipeId: 'haste' })).error).toBe('rank_too_low');

    // Healing potion cures an injury.
    g.db.prepare("UPDATE fighters SET status_kind = 'injured', status_until = ? WHERE id = ?").run(g.clock.now() + 9e9, g.fighterId);
    const potion = (await g.get('/v1/game/inventory')).items.find((i: { templateId: string }) => i.templateId === 'potion_heal');
    expect((await g.post(`/v1/game/items/${potion.id}/use`, { fighterId: g.fighterId })).ok).toBe(true);
    const state = await g.get('/v1/game/state');
    expect(state.fighters.find((f: { id: string }) => f.id === g.fighterId).status).toBe('idle');
  });

  it('expeditions can drop items and luck potions are consumed at send', async () => {
    const g = await gang('scout');
    addItem(g.db, g.accountId, { templateId: 'potion_luck', itemLevel: 1, rarity: 'common', upgrade: 0, qty: 1 }, 0);
    const start = await g.post('/v1/game/expeditions', { zoneId: 'dark_forest', fighterIds: [g.fighterId], useLuck: true });
    expect(start.id).toBeTruthy();
    expect((await g.get('/v1/game/state')).luckPotions).toBe(0);
    g.clock.advance(3_600_000);
    await g.get('/v1/game/state');
    const report = (await g.get('/v1/game/reports')).reports[0];
    expect(Array.isArray(report.body.items)).toBe(true);
  });
});
