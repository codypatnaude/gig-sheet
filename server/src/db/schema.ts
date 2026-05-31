import Database from 'better-sqlite3';

export function initDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id            TEXT    PRIMARY KEY,
      title         TEXT    NOT NULL,
      artist        TEXT,
      key           TEXT,
      tempo         INTEGER,
      duration      TEXT,
      notes         TEXT,
      master_chart  TEXT,
      chart_guitar  TEXT,
      chart_bass    TEXT,
      chart_drums   TEXT,
      chart_vocals  TEXT,
      chart_keys    TEXT,
      chart_other   TEXT,
      setlist_order INTEGER NOT NULL,
      created_at    TEXT    NOT NULL,
      updated_at    TEXT    NOT NULL
    );
  `);

  // Idempotent migration: add master_chart to existing DBs that predate this column
  const cols = (db.pragma('table_info(songs)') as Array<{ name: string }>).map((c) => c.name);
  if (!cols.includes('master_chart')) {
    db.exec('ALTER TABLE songs ADD COLUMN master_chart TEXT;');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT    PRIMARY KEY,
      song_id     TEXT    NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      line_index  INTEGER NOT NULL,
      role        TEXT    NOT NULL,
      text        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_song_id ON notes(song_id);
  `);

  return db;
}
