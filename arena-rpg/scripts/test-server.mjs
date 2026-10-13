// Friend test server: runs the game on this computer and opens a free, temporary
// HTTPS address (Cloudflare quick tunnel, no account) that works from anywhere.
//   npm run test-server             → real durations
//   npm run test-server -- --rebuild  → rebuild the web version first
// Android testers: install the test APK and type the address on the sign-in screen.
// iPhone testers: open the address in Safari → Share → "Add to Home Screen".
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'apps', 'mobile', 'dist');
const shell = process.platform === 'win32';
const PORT = process.env.PORT ?? '8787';

if (process.argv.includes('--rebuild') || !fs.existsSync(path.join(dist, 'index.html'))) {
  console.log('Web sürümü hazırlanıyor (bir kez, 1-2 dakika)…');
  const r = spawnSync('npx', ['expo', 'export', '-p', 'web'], { cwd: path.join(root, 'apps', 'mobile'), stdio: 'inherit', shell });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const env = {
  ...process.env,
  PORT,
  STATIC_DIR: dist,
  TEST_CODES: '1', // no e-mail on a test server: the app fills in the code itself
  DB_PATH: process.env.DB_PATH ?? path.join(root, 'apps', 'server', 'arena-test.db'),
  GAME_SPEED: process.env.GAME_SPEED ?? '1',
};
const server = spawn('npx', ['tsx', 'src/index.ts'], { cwd: path.join(root, 'apps', 'server'), env, stdio: ['ignore', 'pipe', 'inherit'], shell });
server.stdout.on('data', (d) => {
  const text = String(d);
  if (/doğrulama kodun|OYUN SUNUCUSU|listening/i.test(text)) process.stdout.write(text);
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Sunucu açılmadı.');
}

await waitForServer();
console.log('Sunucu açık. İnternet adresi alınıyor (ilk seferde cloudflared indirilir)…');

const tunnel = spawn('npx', ['--yes', 'cloudflared@0.7.3', 'tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'], shell });
let shown = false;
const onOutput = (d) => {
  const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(String(d));
  if (!m || shown) return;
  shown = true;
  const url = m[0];
  const line = '='.repeat(64);
  console.log(`\n${line}\n  AEGIS TEST SUNUCUSU HAZIR\n\n  Adres:  ${url}\n`);
  console.log('  Android: test APK\'sını kur → giriş ekranında "Sunucu adresini değiştir"e');
  console.log('           dokun → bu adresi yaz → "Kaydet ve dene".');
  console.log('  iPhone:  Safari\'de bu adresi aç → Paylaş → "Ana Ekrana Ekle".');
  console.log('  Bilgisayar: tarayıcıda bu adresi aç.\n');
  console.log('  Bu pencere açık kaldığı sürece oyun çalışır. Kapatınca adres de kapanır;');
  console.log('  bir dahaki sefere adres değişir (arkadaşlarına yenisini gönder).');
  console.log(`${line}\n`);
};
tunnel.stdout.on('data', onOutput);
tunnel.stderr.on('data', onOutput);
tunnel.on('exit', (code) => {
  if (!shown) console.error(`İnternet adresi alınamadı (cloudflared çıkış kodu ${code}). İnternet bağlantını kontrol edip tekrar dene.`);
});

const stop = () => {
  tunnel.kill();
  server.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => {
  console.error(`Oyun sunucusu kapandı (çıkış kodu ${code}).`);
  tunnel.kill();
  process.exit(1);
});
