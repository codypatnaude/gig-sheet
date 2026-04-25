import Database from 'better-sqlite3';

export function initDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id           TEXT    PRIMARY KEY,
      title        TEXT    NOT NULL,
      artist       TEXT,
      key          TEXT,
      tempo        INTEGER,
      duration     TEXT,
      notes        TEXT,
      chart_guitar  TEXT,
      chart_bass    TEXT,
      chart_drums   TEXT,
      chart_vocals  TEXT,
      chart_keys    TEXT,
      chart_other   TEXT,
      setlist_order INTEGER NOT NULL,
      created_at   TEXT    NOT NULL,
      updated_at   TEXT    NOT NULL
    );
  `);

  return db;
}
