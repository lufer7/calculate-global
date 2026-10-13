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
  `
  -- Gang inventory (shared bag) and equipped items (fighter_id + slot set).
  CREATE TABLE items (
    id          TEXT PRIMARY KEY,
    account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    item_level  INTEGER NOT NULL,
    rarity      TEXT NOT NULL,
    upgrade     INTEGER NOT NULL DEFAULT 0,
    qty         INTEGER NOT NULL DEFAULT 1,
    fighter_id  TEXT REFERENCES fighters(id) ON DELETE SET NULL,
    slot        TEXT,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX items_account ON items(account_id);
  CREATE UNIQUE INDEX items_equipped ON items(fighter_id, slot) WHERE fighter_id IS NOT NULL;
  ALTER TABLE fighters ADD COLUMN hp_at INTEGER;
  ALTER TABLE fighters ADD COLUMN hunt_at INTEGER;
  ALTER TABLE fighters ADD COLUMN arena_points INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE fighters ADD COLUMN arena_wins INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE fighters ADD COLUMN arena_losses INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE fighters ADD COLUMN arena_ready_at INTEGER;
  ALTER TABLE fighters ADD COLUMN arena_roll INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE expeditions ADD COLUMN luck INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE market_purchases (
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    hour_key   INTEGER NOT NULL,
    offer_id   TEXT NOT NULL,
    PRIMARY KEY (account_id, hour_key, offer_id)
  );
  `,
  `
  -- Expedition trail progress per zone ("kaldığı yerden devam").
  CREATE TABLE zone_progress (
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    zone_id    TEXT NOT NULL,
    cleared    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, zone_id)
  );
  ALTER TABLE expeditions ADD COLUMN stage INTEGER NOT NULL DEFAULT 1;
  `,
  `
  -- Keşif: long Ogame-style explorations with player-chosen travel / exploring time.
  CREATE TABLE explorations (
    id          TEXT PRIMARY KEY,
    account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    fighter_ids TEXT NOT NULL,
    started_at  INTEGER NOT NULL,
    travel_ms   INTEGER NOT NULL,           -- one way, real (speed-adjusted) time
    explore_ms  INTEGER NOT NULL,
    base_travel_ms  INTEGER NOT NULL,       -- as chosen by the player (game time, for rewards)
    base_explore_ms INTEGER NOT NULL,
    ends_at     INTEGER NOT NULL,
    seed        INTEGER NOT NULL,
    state       TEXT NOT NULL CHECK (state IN ('active', 'recalled', 'done'))
  );
  CREATE INDEX explorations_account ON explorations(account_id, state);
  -- Sancak (clans). No chat and no free text except a moderated name/tag.
  CREATE TABLE clans (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    name_key      TEXT NOT NULL UNIQUE,
    tag           TEXT NOT NULL UNIQUE,
    emblem_color  INTEGER NOT NULL DEFAULT 0,
    emblem_symbol INTEGER NOT NULL DEFAULT 0,
    join_policy   TEXT NOT NULL DEFAULT 'open' CHECK (join_policy IN ('open', 'request')),
    xp            INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );
  CREATE TABLE clan_members (
    account_id   TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    clan_id      TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    role         TEXT NOT NULL CHECK (role IN ('leader', 'officer', 'member')),
    joined_at    INTEGER NOT NULL,
    contribution INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX clan_members_clan ON clan_members(clan_id);
  CREATE TABLE clan_requests (
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    clan_id    TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    at         INTEGER NOT NULL,
    PRIMARY KEY (account_id, clan_id)
  );
  CREATE TABLE clan_raids (
    id         TEXT PRIMARY KEY,
    clan_id    TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    boss_id    TEXT NOT NULL,
    hp         INTEGER NOT NULL,
    max_hp     INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    ends_at    INTEGER NOT NULL,
    state      TEXT NOT NULL CHECK (state IN ('active', 'won', 'expired'))
  );
  CREATE INDEX clan_raids_clan ON clan_raids(clan_id, state);
  CREATE TABLE clan_raid_hits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    raid_id    TEXT NOT NULL REFERENCES clan_raids(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    fighter_id TEXT,
    damage     INTEGER NOT NULL,
    at         INTEGER NOT NULL
  );
  CREATE INDEX clan_raid_hits_raid ON clan_raid_hits(raid_id);
  CREATE TABLE clan_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    text    TEXT NOT NULL,              -- system generated only, never player-typed
    at      INTEGER NOT NULL
  );
  CREATE INDEX clan_log_clan ON clan_log(clan_id, id);
  CREATE TABLE clan_helps (
    target_kind TEXT NOT NULL CHECK (target_kind IN ('research', 'expedition', 'exploration')),
    target_id   TEXT NOT NULL,
    helper_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    at          INTEGER NOT NULL,
    PRIMARY KEY (target_kind, target_id, helper_id)
  );
  ALTER TABLE accounts ADD COLUMN clan_left_at INTEGER;
  ALTER TABLE fighters ADD COLUMN raid_ready_at INTEGER;
  `,
  `
  -- Rev4: per-fighter energy, Cami rest, arena plunder shield; timed expeditions replaced by creature fights.
  ALTER TABLE fighters ADD COLUMN energy REAL NOT NULL DEFAULT 20;
  ALTER TABLE fighters ADD COLUMN energy_at INTEGER;
  ALTER TABLE accounts ADD COLUMN arena_shield_until INTEGER;
  ALTER TABLE explorations ADD COLUMN luck INTEGER NOT NULL DEFAULT 0;
  UPDATE fighters SET status_kind = 'idle', status_until = NULL WHERE status_kind = 'expedition';
  UPDATE expeditions SET state = 'done' WHERE state != 'done';
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
