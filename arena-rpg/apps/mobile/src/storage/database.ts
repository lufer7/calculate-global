import * as SQLite from 'expo-sqlite';

const DB_NAME = 'arena.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Local-only database. There is no server copy of this data. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await migrate(db);
    return db;
  })();
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS save_slots (
        slot       INTEGER PRIMARY KEY NOT NULL,
        blob       TEXT    NOT NULL,      -- AES-256-GCM encrypted SaveGame
        updated_at INTEGER NOT NULL
      );
    `);
  }
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export async function closeAndDeleteDb() {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME);
}
