import { networkInterfaces } from 'node:os';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import { createApp } from './app';
import { openDatabase } from './db/database';
import type { Mailer } from './lib/mailer';
import { DevConsoleMailer, SmtpMailer } from './lib/mailer';
import { runRetention } from './privacy/retention';

const port = Number(process.env.PORT ?? 8787);
const production = process.env.NODE_ENV === 'production';
// Behind a reverse proxy set TRUST_PROXY=1 and make sure the proxy itself has access logs OFF.
const trustProxy = process.env.TRUST_PROXY === '1';

let mailer: Mailer;
if (process.env.SMTP_URL && process.env.MAIL_FROM) {
  mailer = new SmtpMailer(process.env.SMTP_URL, process.env.MAIL_FROM);
} else if (production) {
  console.error('SMTP_URL ve MAIL_FROM ayarlanmadan üretim modunda başlatılamaz (doğrulama kodları gönderilemez).');
  process.exit(1);
} else {
  mailer = new DevConsoleMailer();
}

const clientIp = (c: Context) =>
  (trustProxy ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ?? getConnInfo(c).remote.address ?? 'unknown';

if (production && (process.env.PROPHECY_SECRET ?? '').length < 16) {
  console.error('PROPHECY_SECRET (en az 16 karakter, rastgele) ayarlanmadan üretim modunda başlatılamaz.');
  process.exit(1);
}

// ADMIN_ALLOWED_IPS="1.2.3.4,5.6.7.8" hides /admin (404) from every other address.
const adminIps = (process.env.ADMIN_ALLOWED_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const db = openDatabase(process.env.DB_PATH ?? 'arena.db');

const app = createApp({
  db,
  mailer,
  clientKey: clientIp,
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL,
  adminAllowed: adminIps.length ? (c) => adminIps.includes(clientIp(c)) : undefined,
  gameSpeed: production ? 1 : Number(process.env.GAME_SPEED ?? 1),
  prophecySecret: process.env.PROPHECY_SECRET ?? 'dev-prophecy',
  corsOrigin: production ? undefined : '*',
});

// Storage & destruction policy: at start-up and every 6 hours.
const retention = () => runRetention(db, mailer, Date.now()).catch((e) => console.error('retention failed', e));
void retention();
setInterval(retention, 6 * 3_600_000).unref();

serve({ fetch: app.fetch, port }, () => {
  // Startup message only – the server never logs requests.
  const speed = Number(process.env.GAME_SPEED ?? 1);
  console.log(`arena server listening on :${port} (admin panel: /admin)${speed > 1 && !production ? ` · test mode: timers ${speed}x faster` : ''}`);
  if (!production) {
    const lan = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i!.address);
    console.log('\n================ OYUN SUNUCUSU HAZIR ================');
    console.log(`Bu bilgisayarda:          http://localhost:${port}/health`);
    for (const ip of lan) console.log(`Telefondan bağlanmak için: http://${ip}:${port}   (uygulamaya "${ip}" yazman yeterli)`);
    console.log('Telefonun tarayıcısında bu adresin sonuna /health ekleyip açınca {"ok":true} görmelisin.');
    console.log('=====================================================\n');
  }
});
