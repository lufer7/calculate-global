import { randomBytes } from 'node:crypto';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import type { PvpSnapshot } from '@arena/core';
import {
  displayNameFromId, eloDelta, generateOpponent, isValidLadderToken, ladderIdFromToken,
  simulateBattle, snapshotToCombatant, validateSnapshot,
} from '@arena/core';
import { accountRoutes } from './accounts/routes';
import { addNotification } from './accounts/repo';
import { adminPanelHtml } from './admin/panel';
import { adminRoutes } from './admin/routes';
import { gameRoutes } from './game/routes';
import { privacyRoutes } from './privacy/routes';
import type { Db } from './db/database';
import { openDatabase } from './db/database';
import type { Mailer } from './lib/mailer';
import { MemoryMailer } from './lib/mailer';
import { rateLimit } from './lib/rateLimit';
import { TtlStore } from './lib/ttlStore';

const HOUR = 60 * 60 * 1000;
export const LADDER_TTL_MS = 30 * 24 * HOUR; // inactive entries vanish; seasons also reset the store
export const POOL_TTL_MS = 24 * HOUR; // opponent snapshots
export const TRANSFER_TTL_MS = 72 * HOUR; // encrypted save blobs
const TRANSFER_MAX_BYTES = 64 * 1024;

interface LadderEntry {
  rating: number;
  wins: number;
  losses: number;
}

export interface AppDeps {
  now?: () => number;
  /** Returns a transient per-connection key used only for rate limiting (see rateLimit.ts). */
  clientKey?: Parameters<typeof rateLimit>[0]['clientKey'];
  rateLimitPerMinute?: number;
  db?: Db;
  mailer?: Mailer;
  /** Owner's address for "new member / new fighter" mails. Mails never contain the player's email. */
  adminNotifyEmail?: string;
  /** Extra gate for /admin (e.g. an IP allowlist). Return false to answer 404. */
  adminAllowed?: (c: Context) => boolean;
  /** Development only: makes every timer N times faster. */
  gameSpeed?: number;
  prophecySecret?: string;
  /** Development web preview runs on another port; native apps do not need CORS. */
  corsOrigin?: string;
  /** Private test server: verification codes are shown in the app (no e-mail needed). */
  testCodes?: boolean;
  /** Folder with the exported web app; served at / so one address works in any browser. */
  staticDir?: string;
}

export function createApp(deps: AppDeps = {}) {
  const now = deps.now ?? Date.now;
  const ladder = new TtlStore<LadderEntry>(now);
  const pool = new TtlStore<{ ladderId: string; snapshot: PvpSnapshot; rating: number }>(now);
  const transfers = new TtlStore<string>(now);

  const db = deps.db ?? openDatabase(':memory:');
  const mailer = deps.mailer ?? new MemoryMailer();
  const clientKey = deps.clientKey ?? (() => 'global');
  const notifyAdmin = async (kind: string, accountId: string, text: string) => {
    addNotification(db, kind, accountId, text, now());
    if (deps.adminNotifyEmail) {
      await mailer.send({ to: deps.adminNotifyEmail, subject: `[Aegis] ${text}`, text: `${text}\nAyrıntılar yönetim panelinde.` }).catch(() => undefined);
    }
  };

  const app = new Hono();

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
  });

  // Deliberately NO logger middleware: no access logs, no IPs, no user agents on disk.
  if (deps.corsOrigin) {
    const policy = cors({ origin: deps.corsOrigin, allowHeaders: ['content-type', 'authorization'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] });
    app.use('/v1/*', policy);
    app.use('/health', policy);
  }
  for (const path of ['/v1/*', '/admin/*']) {
    app.use(path, bodyLimit({ maxSize: TRANSFER_MAX_BYTES + 1024, onError: (c) => c.json({ error: 'too_large' }, 413) }));
  }
  app.use('/v1/*', rateLimit({ windowMs: 60_000, max: deps.rateLimitPerMinute ?? 120, clientKey, now }));
  // Credential endpoints get a much tighter budget against password guessing.
  for (const path of ['/v1/auth/*', '/admin/api/login']) {
    app.use(path, rateLimit({ windowMs: 60_000, max: 10, clientKey, now }));
  }
  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  app.get('/health', (c) => c.json({ ok: true }));

  // ---- Accounts (email sign-up) ----
  app.route('/v1', accountRoutes({ db, mailer, now, notifyAdmin, testCodes: deps.testCodes }));
  app.route('/v1/me', privacyRoutes(db, mailer, now));
  app.route('/v1/game', gameRoutes(db, { now, speed: deps.gameSpeed ?? 1, prophecySecret: deps.prophecySecret ?? 'dev-prophecy' }));

  // ---- Owner-only admin panel ----
  app.use('/admin', async (c, next) => ((deps.adminAllowed?.(c) ?? true) ? next() : c.notFound()));
  app.use('/admin/*', async (c, next) => ((deps.adminAllowed?.(c) ?? true) ? next() : c.notFound()));
  app.get('/admin', (c) => {
    const nonce = randomBytes(16).toString('base64');
    c.header(
      'Content-Security-Policy',
      `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self' data:; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
    );
    c.header('X-Frame-Options', 'DENY');
    c.header('X-Robots-Tag', 'noindex, nofollow');
    return c.html(adminPanelHtml(nonce));
  });
  app.route('/admin/api', adminRoutes({ db, now, mailer }));

  // ---- PvP: client sends {token, snapshot}; server validates & simulates. ----
  app.post('/v1/pvp/fight', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || !isValidLadderToken(body.token)) return c.json({ error: 'bad_token' }, 400);
    const snap = validateSnapshot(body.snapshot);
    if (!snap.ok) return c.json({ error: snap.error }, 400);

    const ladderId = ladderIdFromToken(body.token);
    const me = ladder.get(ladderId) ?? { rating: 1000, wins: 0, losses: 0 };

    const candidates = pool
      .values()
      .filter((p) => p.ladderId !== ladderId && Math.abs(p.snapshot.level - snap.value.level) <= 3);
    const seed = randomBytes(4).readUInt32LE(0);
    const picked = candidates.length > 0 ? candidates[seed % candidates.length]! : null;
    const opponent = picked
      ? { name: displayNameFromId(picked.ladderId), setup: snapshotToCombatant(picked.snapshot), rating: picked.rating }
      : { name: null, setup: generateOpponent(snap.value.level, seed), rating: me.rating };

    const battle = simulateBattle(snapshotToCombatant(snap.value), opponent.setup, seed);
    const score = battle.winner === 'a' ? 1 : battle.winner === 'b' ? 0 : 0.5;
    const delta = eloDelta(me.rating, opponent.rating, score, picked ? 32 : 16);
    const updated: LadderEntry = {
      rating: me.rating + delta,
      wins: me.wins + (score === 1 ? 1 : 0),
      losses: me.losses + (score === 0 ? 1 : 0),
    };
    ladder.set(ladderId, updated, LADDER_TTL_MS);
    pool.set(ladderId, { ladderId, snapshot: snap.value, rating: updated.rating }, POOL_TTL_MS);

    return c.json({
      seed,
      result: battle.winner,
      log: battle.log,
      opponent: { displayName: opponent.name, isGhost: !picked, snapshot: picked?.snapshot ?? null },
      me: { displayName: displayNameFromId(ladderId), ...updated, delta },
    });
  });

  app.get('/v1/ladder', (c) => {
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 50));
    ladder.sweep();
    const top = [...pool.values()]
      .map((p) => ({ ladderId: p.ladderId, entry: ladder.get(p.ladderId) }))
      .filter((x): x is { ladderId: string; entry: LadderEntry } => !!x.entry)
      .sort((a, b) => b.entry.rating - a.entry.rating)
      .slice(0, limit)
      .map(({ ladderId, entry }) => ({ displayName: displayNameFromId(ladderId), ...entry }));
    return c.json({ entries: top });
  });

  // "Delete my online data": removes ladder entry and pooled snapshot immediately.
  app.delete('/v1/ladder', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || !isValidLadderToken(body.token)) return c.json({ error: 'bad_token' }, 400);
    const id = ladderIdFromToken(body.token);
    ladder.delete(id);
    pool.delete(id);
    return c.body(null, 204);
  });

  // ---- Zero-knowledge transfer relay: opaque ciphertext under a random id. ----
  const LOOKUP = /^[0-9a-f]{32}$/;
  app.put('/v1/transfer/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    if (!LOOKUP.test(id) || !body || typeof body.blob !== 'string' || !body.blob.startsWith('AR1.')) {
      return c.json({ error: 'bad_request' }, 400);
    }
    if (body.blob.length > TRANSFER_MAX_BYTES) return c.json({ error: 'too_large' }, 413);
    transfers.set(id, body.blob, TRANSFER_TTL_MS);
    return c.json({ expiresInHours: TRANSFER_TTL_MS / HOUR });
  });

  app.get('/v1/transfer/:id', (c) => {
    const id = c.req.param('id');
    if (!LOOKUP.test(id)) return c.json({ error: 'bad_request' }, 400);
    const blob = transfers.take(id); // one-time read
    return blob ? c.json({ blob }) : c.json({ error: 'not_found' }, 404);
  });

  // Test server: the exported web app is served from the same address as the API.
  if (deps.staticDir) {
    const root = deps.staticDir;
    app.use('*', async (c, next) => {
      if (c.req.method !== 'GET' || /^\/(v1|admin|health)(\/|$)/.test(c.req.path)) return next();
      return serveStatic({ root })(c, next);
    });
    app.get('*', async (c, next) => {
      if (/^\/(v1|admin|health)(\/|$)/.test(c.req.path)) return next();
      return serveStatic({ root, path: 'index.html' })(c, next);
    });
  }

  return app;
}
