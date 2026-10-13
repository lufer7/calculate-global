import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { LEGAL_VERSIONS } from '../src/accounts/routes';
import { openDatabase } from '../src/db/database';
import { MemoryMailer } from '../src/lib/mailer';
import { addItem } from '../src/game/items';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (res: Response): Promise<any> => res.json();
const legal = { acceptTerms: true, privacyNoticeAck: true, ageConfirmed: true, termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy };

interface World { db: ReturnType<typeof openDatabase>; clock: { now: () => number; advance: (ms: number) => number }; app: ReturnType<typeof createApp>; mailer: MemoryMailer }

async function gang(cls = 'swordmaster', email = 'g@example.com', shared?: { world: World }) {
  let t = Date.UTC(2026, 9, 13, 10);
  const world: World = shared?.world ?? (() => {
    const clock = { now: () => t, advance: (ms: number) => (t += ms) };
    const db = openDatabase(':memory:');
    const mailer = new MemoryMailer();
    return { db, clock, mailer, app: createApp({ db, mailer, now: clock.now, rateLimitPerMinute: 100_000 }) };
  })();
  const { db, clock, mailer, app } = world;
  const req = (path: string, method = 'GET', body?: unknown, token?: string) =>
    app.request(path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  await req('/v1/auth/register', 'POST', { email, password: 'cok-gizli-sifre', ...legal });
  const code = /(\d{6})/.exec(mailer.sent.at(-1)!.text)![1];
  const token = (await read(await req('/v1/auth/verify', 'POST', { email, code }))).token as string;
  const f = await read(await req('/v1/fighters', 'POST', { name: email.startsWith('b') ? 'Gece Okçu' : 'Kara Demir', class: cls }, token));
  const accountId = (db.prepare('SELECT id FROM accounts WHERE email = ?').get(email) as { id: string }).id;
  const get = async (p: string) => read(await req(p, 'GET', undefined, token));
  const post = async (p: string, b: unknown = {}) => read(await req(p, 'POST', b, token));
  return { db, clock, get, post, fighterId: f.id as string, accountId, world };
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

  it('merges duplicates for +1 (with swordmaster discount), sells and eats food', async () => {
    const g = await gang();
    let inv = await g.get('/v1/game/inventory');
    const sword = inv.items.find((i: { templateId: string }) => i.templateId === 'sword');
    const dupe = addItem(g.db, g.accountId, { templateId: 'sword', itemLevel: 3, rarity: sword.rarity, upgrade: 0, qty: 1 }, 0)!;
    const other = addItem(g.db, g.accountId, { templateId: 'sword', itemLevel: 1, rarity: 'legendary', upgrade: 0, qty: 1 }, 0)!;
    expect((await g.post(`/v1/game/items/${sword.id}/merge`, { sourceId: other })).error).toBe('not_same_item');
    const up = await g.post(`/v1/game/items/${sword.id}/merge`, { sourceId: dupe });
    expect(up.upgrade).toBe(1);
    expect(up.itemLevel).toBe(3);
    inv = await g.get('/v1/game/inventory');
    expect(inv.items.some((i: { id: string }) => i.id === dupe)).toBe(false);
    const merged = inv.items.find((i: { id: string }) => i.id === sword.id);
    expect(merged.upgradeCost).toBeGreaterThan(up.cost);
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
  it('fights NPCs for 1 energy each, pays rewards and drains HP on loss', async () => {
    const g = await gang();
    const a = await g.get(`/v1/game/arena?fighterId=${g.fighterId}`);
    expect(a.npcs).toHaveLength(3);
    const r = await g.post('/v1/game/arena/fight', { fighterId: g.fighterId, opponent: { type: 'npc', id: 'npc0' } });
    expect(r.outcome.log.length).toBeGreaterThan(0);
    expect(r.hpRatio).toBe(r.won ? 1 : 0.85);
    expect(r.energy.value).toBe(19);
    const again = await g.post('/v1/game/arena/fight', { fighterId: g.fighterId, opponent: { type: 'npc', id: 'npc0' } });
    expect(again.energy.value).toBe(18); // no cooldown any more, energy is the limit
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

  it('luck potions are consumed when sending a keşif; haste potions shorten a running one', async () => {
    const g = await gang('scout');
    addItem(g.db, g.accountId, { templateId: 'potion_luck', itemLevel: 1, rarity: 'common', upgrade: 0, qty: 1 }, 0);
    addItem(g.db, g.accountId, { templateId: 'potion_haste', itemLevel: 1, rarity: 'common', upgrade: 0, qty: 1 }, 0);
    const start = await g.post('/v1/game/explorations', { fighterIds: [g.fighterId], travelMs: 3_600_000, exploreMs: 0, useLuck: true });
    expect(start.id).toBeTruthy();
    expect((await g.get('/v1/game/state')).luckPotions).toBe(0);
    const haste = (await g.get('/v1/game/inventory')).items.find((i: { templateId: string }) => i.templateId === 'potion_haste');
    const r = await g.post(`/v1/game/items/${haste.id}/use`, { explorationId: start.id });
    expect(r.endsAt - g.clock.now()).toBe(Math.round(2 * 3_600_000 * 0.9));
  });
});

describe('arena PvP', () => {
  it('the winner steals ~30% of the loser\'s gold, then the loser is shielded for an hour', async () => {
    const a = await gang('swordmaster', 'a@example.com');
    const b = await gang('scout', 'b@example.com', a);
    a.db.prepare('UPDATE fighters SET level = 30 WHERE id = ?').run(a.fighterId);
    a.db.prepare('UPDATE fighters SET level = 26 WHERE id = ?').run(b.fighterId);
    a.db.prepare('UPDATE accounts SET gold = 1000 WHERE id = ?').run(b.accountId);
    const arena = await a.get(`/v1/game/arena?fighterId=${a.fighterId}`);
    const foe = arena.players.find((p: { id: string }) => p.id === b.fighterId);
    expect(foe).toBeTruthy();
    let won: { rewards: { stolen: number } } | null = null;
    for (let i = 0; i < 15 && !won; i++) {
      a.db.prepare('UPDATE fighters SET hp_ratio = 1, energy = 20').run();
      const r = await a.post('/v1/game/arena/fight', { fighterId: a.fighterId, opponent: { type: 'player', id: b.fighterId } });
      if (r.won) won = r;
    }
    expect(won).not.toBeNull();
    // Kılıç Hakkı (swordmaster main class) plunders 25% more: 1000 × 0.3 × 1.25
    expect(won!.rewards.stolen).toBe(375);
    const gold = (a.db.prepare('SELECT gold FROM accounts WHERE id = ?').get(b.accountId) as { gold: number }).gold;
    expect(gold).toBe(625);
    const rep = (await b.get('/v1/game/reports')).reports.find((x: { kind: string }) => x.kind === 'arena_defense');
    expect(rep.body.stolen).toBe(375);
    // shielded now: another win steals nothing
    for (let i = 0; i < 15; i++) {
      a.db.prepare('UPDATE fighters SET hp_ratio = 1, energy = 20').run();
      const r = await a.post('/v1/game/arena/fight', { fighterId: a.fighterId, opponent: { type: 'player', id: b.fighterId } });
      if (r.won) {
        expect(r.rewards.stolen).toBe(0);
        break;
      }
    }
  });
});
