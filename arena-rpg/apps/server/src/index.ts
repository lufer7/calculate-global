import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import { createApp } from './app';
import { openDatabase } from './db/database';
import { DevConsoleMailer } from './lib/mailer';

const port = Number(process.env.PORT ?? 8787);
const production = process.env.NODE_ENV === 'production';
// Behind a reverse proxy set TRUST_PROXY=1 and make sure the proxy itself has access logs OFF.
const trustProxy = process.env.TRUST_PROXY === '1';

if (production) {
  // A real Mailer (SMTP/API with a DPA) must be wired in before going live; the dev mailer prints codes.
  console.error('Production mailer is not configured. Implement Mailer in src/lib/mailer.ts and wire it here.');
  process.exit(1);
}

const clientIp = (c: Context) =>
  (trustProxy ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ?? getConnInfo(c).remote.address ?? 'unknown';

// ADMIN_ALLOWED_IPS="1.2.3.4,5.6.7.8" hides /admin (404) from every other address.
const adminIps = (process.env.ADMIN_ALLOWED_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const app = createApp({
  db: openDatabase(process.env.DB_PATH ?? 'arena.db'),
  mailer: new DevConsoleMailer(),
  clientKey: clientIp,
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL,
  adminAllowed: adminIps.length ? (c) => adminIps.includes(clientIp(c)) : undefined,
  gameSpeed: production ? 1 : Number(process.env.GAME_SPEED ?? 1),
  prophecySecret: process.env.PROPHECY_SECRET ?? 'dev-prophecy',
  corsOrigin: production ? undefined : '*',
});

serve({ fetch: app.fetch, port }, () => {
  // Startup message only – the server never logs requests.
  const speed = Number(process.env.GAME_SPEED ?? 1);
  console.log(`arena server listening on :${port} (admin panel: /admin)${speed > 1 ? ` · test mode: timers ${speed}x faster` : ''}`);
});
