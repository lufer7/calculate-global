// One command for local testing: game server (with faster timers) + Expo with the QR code.
//   npm run dev            → timers 20x faster
//   GAME_SPEED=1 npm run dev → real durations
import { spawn } from 'node:child_process';

// Same default DB as `npm run server` and `npm run admin:create` (apps/server/arena.db).
const env = { ...process.env, GAME_SPEED: process.env.GAME_SPEED ?? '20' };
const opts = { stdio: 'inherit', env, shell: process.platform === 'win32' };

const server = spawn('npm', ['run', 'dev', '-w', '@arena/server'], opts);
server.on('exit', (code) => {
  console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error(`!!  OYUN SUNUCUSU KAPANDI (çıkış kodu ${code}).`);
  console.error('!!  Uygulama "Sunucuya ulaşılamıyor" diyecek. Yukarıdaki hata');
  console.error('!!  satırlarını kopyalayıp gönderirsen sorunu çözebilirim.');
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
});
const mobile = spawn('npm', ['run', 'start', '-w', '@arena/mobile', '--', ...process.argv.slice(2)], opts);

const stop = () => {
  server.kill();
  mobile.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
mobile.on('exit', () => {
  server.kill();
  process.exit(0);
});
