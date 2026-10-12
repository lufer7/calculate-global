/**
 * Creates (or resets) the owner's admin login and prints the authenticator secret ONCE.
 *   npm run admin:create -w @arena/server -- you@example.com
 * The password is read from the ADMIN_PASSWORD env var so it never lands in shell history.
 */
import { openDatabase } from '../src/db/database';
import { hashPassword, newTotpSecret, otpauthUri, randomId } from '../src/lib/security';

const email = (process.argv[2] ?? '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';
if (!email.includes('@') || password.length < 14) {
  console.error('Kullanım: ADMIN_PASSWORD="en az 14 karakter" npm run admin:create -w @arena/server -- you@example.com');
  process.exit(1);
}

const db = openDatabase(process.env.DB_PATH ?? 'arena.db');
const secret = newTotpSecret();
const hash = await hashPassword(password);
db.prepare(
  `INSERT INTO admins (id, email, password_hash, totp_secret, created_at) VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, totp_secret = excluded.totp_secret, last_totp_step = 0`,
).run(randomId(), email, hash, secret, Date.now());
db.prepare("DELETE FROM sessions WHERE kind = 'admin'").run();

console.log('Yönetici hesabı hazır.');
console.log('Kimlik doğrulama uygulamanıza (Google Authenticator, Aegis, 1Password…) şu anahtarı ekleyin:');
console.log(`  Anahtar: ${secret}`);
console.log(`  URI:     ${otpauthUri(email, secret)}`);
console.log('Bu anahtar bir daha gösterilmez. Panel: http://localhost:8787/admin');
