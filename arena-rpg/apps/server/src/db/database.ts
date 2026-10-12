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
  `
  ALTER TABLE accounts ADD COLUMN gold INTEGER NOT NULL DEFAULT 200;
  ALTER TABLE accounts ADD COLUMN research_json TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE accounts ADD COLUMN active_research TEXT;
  ALTER TABLE fighters ADD COLUMN skills_json TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE fighters ADD COLUMN hp_ratio REAL NOT NULL DEFAULT 1;
  ALTER TABLE fighters ADD COLUMN status_kind TEXT NOT NULL DEFAULT 'idle';
  ALTER TABLE fighters ADD COLUMN status_until INTEGER;
  ALTER TABLE fighters ADD COLUMN respec_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE fighters ADD COLUMN respec_at INTEGER;
  CREATE TABLE expeditions (
    id               TEXT PRIMARY KEY,
    account_id       TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    zone_id          TEXT NOT NULL,
    fighter_ids      TEXT NOT NULL,           -- JSON array
    started_at       INTEGER NOT NULL,
    ends_at          INTEGER NOT NULL,
    base_duration_ms INTEGER NOT NULL,
    seed             INTEGER NOT NULL,        -- server RNG seed, kept for audits
    state            TEXT NOT NULL CHECK (state IN ('active', 'recalled', 'done'))
  );
  CREATE INDEX expeditions_account ON expeditions(account_id, state);
  CREATE TABLE reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body_json  TEXT NOT NULL,
    at         INTEGER NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX reports_account ON reports(account_id, id);
  `,
  `
  ALTER TABLE accounts ADD COLUMN age_confirmed_at INTEGER;
  ALTER TABLE accounts ADD COLUMN inactivity_warned_at INTEGER;
  ALTER TABLE accounts ADD COLUMN pending_email TEXT;
  -- Append-only evidence of every consent / acknowledgement (KVKK md. 5, ispat yükü).
  CREATE TABLE consent_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('terms', 'privacy', 'marketing', 'age')),
    value      TEXT NOT NULL,
    at         INTEGER NOT NULL
  );
  CREATE INDEX consent_log_account ON consent_log(account_id);
  -- KVKK md. 11 applications. Kept (account_id nulled) after account deletion as proof of handling.
  CREATE TABLE data_requests (
    id           TEXT PRIMARY KEY,
    account_id   TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('access', 'rectification', 'erasure', 'objection', 'other')),
    message      TEXT NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('open', 'answered', 'rejected')),
    created_at   INTEGER NOT NULL,
    due_at       INTEGER NOT NULL,
    answered_at  INTEGER,
    answer       TEXT
  );
  CREATE TABLE retention_runs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    at      INTEGER NOT NULL,
    summary TEXT NOT NULL
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
