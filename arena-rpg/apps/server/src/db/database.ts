import { DatabaseSync } from 'node:sqlite';

/**
 * SQLite (built into Node 22) keeps the server dependency-free for development and tests.
 * The SQL is deliberately portable so it can move to PostgreSQL when the game grows.
 */
export type Db = DatabaseSync;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE accounts (
    id               TEXT PRIMARY KEY,
    email            TEXT NOT NULL UNIQUE,      -- lower-cased; personal data
    password_hash    TEXT NOT NULL,
    display_name     TEXT NOT NULL,             -- generated, never typed by the player
    main_class       TEXT,                      -- class of the first fighter, fixed afterwards
    status           TEXT NOT NULL CHECK (status IN ('pending', 'active', 'banned')),
    ban_reason       TEXT,
    banned_until     INTEGER,                   -- NULL = permanent while banned
    created_at       INTEGER NOT NULL,
    verified_at      INTEGER,
    last_login_at    INTEGER,
    terms_version    TEXT NOT NULL,
    privacy_version  TEXT NOT NULL,
    marketing_consent INTEGER NOT NULL DEFAULT 0,
    consent_at       INTEGER NOT NULL
  );
  CREATE TABLE verification_codes (
    account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE sessions (
    token_hash   TEXT PRIMARY KEY,
    kind         TEXT NOT NULL CHECK (kind IN ('player', 'admin')),
    subject_id   TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    expires_at   INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_subject ON sessions(subject_id);
  CREATE TABLE fighters (
    id         TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    class      TEXT NOT NULL,
    level      INTEGER NOT NULL DEFAULT 1,
    xp         INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX fighters_account ON fighters(account_id);
  CREATE TABLE admins (
    id             TEXT PRIMARY KEY,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    totp_secret    TEXT NOT NULL,
    last_totp_step INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL
  );
  CREATE TABLE admin_audit (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id TEXT NOT NULL,
    action   TEXT NOT NULL,
    target   TEXT,
    detail   TEXT,
    at       INTEGER NOT NULL
  );
  CREATE TABLE admin_notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL,
    account_id TEXT,
    text       TEXT NOT NULL,
    at         INTEGER NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0
  );
  `,
];

export function openDatabase(path = ':memory:'): Db {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}
