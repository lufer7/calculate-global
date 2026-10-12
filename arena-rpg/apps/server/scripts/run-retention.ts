/** Runs the storage & destruction job once:  npm run retention -w @arena/server */
import { openDatabase } from '../src/db/database';
import { DevConsoleMailer, SmtpMailer } from '../src/lib/mailer';
import { runRetention } from '../src/privacy/retention';

const mailer = process.env.SMTP_URL && process.env.MAIL_FROM ? new SmtpMailer(process.env.SMTP_URL, process.env.MAIL_FROM) : new DevConsoleMailer();
const summary = await runRetention(openDatabase(process.env.DB_PATH ?? 'arena.db'), mailer, Date.now());
console.log('Saklama ve imha çalıştı:', summary);
