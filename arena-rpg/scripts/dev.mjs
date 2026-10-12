// One command for local testing: game server (with faster timers) + Expo with the QR code.
//   npm run dev            → timers 20x faster
//   GAME_SPEED=1 npm run dev → real durations
import { spawn } from 'node:child_process';

const env = { ...process.env, GAME_SPEED: process.env.GAME_SPEED ?? '20', DB_PATH: process.env.DB_PATH ?? 'arena-dev.db' };
const opts = { stdio: 'inherit', env, shell: process.platform === 'win32' };

const server = spawn('npm', ['run', 'dev', '-w', '@arena/server'], opts);
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
