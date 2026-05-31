import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Song, NewSong, ChartRole } from '@gig-sheets/shared';

export function getAllSongs(db: Database.Database): Song[] {
  return db
    .prepare('SELECT * FROM songs ORDER BY setlist_order ASC')
    .all() as Song[];
}

export function getSongById(db: Database.Database, id: string): Song | undefined {
  return db
    .prepare('SELECT * FROM songs WHERE id = ?')
    .get(id) as Song | undefined;
}

export function createSong(db: Database.Database, data: NewSong): Song {
  const maxOrder = (
    db.prepare('SELECT MAX(setlist_order) as m FROM songs').get() as { m: number | null }
  ).m ?? -1;

  const now = new Date().toISOString();
  const id = uuidv4();

  // Use null (not undefined) for optional fields — better-sqlite3 named params
  // require all @name references to exist as keys on the object.
  const row = {
    id,
    title: data.title,
    artist: data.artist ?? null,
    key: data.key ?? null,
    tempo: data.tempo ?? null,
    duration: data.duration ?? null,
    notes: data.notes ?? null,
    master_chart: data.master_chart ?? null,
    chart_guitar: data.chart_guitar ?? null,
    chart_bass: data.chart_bass ?? null,
    chart_drums: data.chart_drums ?? null,
    chart_vocals: data.chart_vocals ?? null,
    chart_keys: data.chart_keys ?? null,
    chart_other: data.chart_other ?? null,
    setlist_order: maxOrder + 1,
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO songs (
      id, title, artist, key, tempo, duration, notes, master_chart,
      chart_guitar, chart_bass, chart_drums, chart_vocals, chart_keys, chart_other,
      setlist_order, created_at, updated_at
    ) VALUES (
      @id, @title, @artist, @key, @tempo, @duration, @notes, @master_chart,
      @chart_guitar, @chart_bass, @chart_drums, @chart_vocals, @chart_keys, @chart_other,
      @setlist_order, @created_at, @updated_at
    )
  `).run(row);

  return getSongById(db, id)!;
}

export function updateSong(db: Database.Database, song: Song): Song {
  const updated: Song = {
    ...song,
    updated_at: new Date().toISOString(),
  };

  db.prepare(`
    UPDATE songs SET
      title = @title,
      artist = @artist,
      key = @key,
      tempo = @tempo,
      duration = @duration,
      notes = @notes,
      chart_guitar = @chart_guitar,
      chart_bass = @chart_bass,
      chart_drums = @chart_drums,
      chart_vocals = @chart_vocals,
      chart_keys = @chart_keys,
      chart_other = @chart_other,
      updated_at = @updated_at
    WHERE id = @id
  `).run(updated);

  return updated;
}

export function deleteSong(db: Database.Database, id: string): void {
  const deleteStmt = db.prepare('DELETE FROM songs WHERE id = ?');
  const renumberStmt = db.prepare(
    'UPDATE songs SET setlist_order = setlist_order - 1 WHERE setlist_order > (SELECT setlist_order FROM songs WHERE id = ?)'
  );

  db.transaction(() => {
    renumberStmt.run(id);
    deleteStmt.run(id);
  })();
}

export function migrateSong(
  db: Database.Database,
  songId: string,
  sourceRole: ChartRole
): Song | undefined {
  const song = getSongById(db, songId);
  if (!song) return undefined;

  const chartField = `chart_${sourceRole}` as keyof Song;
  const masterChart = (song[chartField] as string | undefined) ?? '';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE songs SET
      master_chart  = ?,
      chart_guitar  = NULL,
      chart_bass    = NULL,
      chart_drums   = NULL,
      chart_vocals  = NULL,
      chart_keys    = NULL,
      chart_other   = NULL,
      updated_at    = ?
    WHERE id = ?
  `).run(masterChart, now, songId);

  return getSongById(db, songId);
}

export function reorderSongs(db: Database.Database, orderedIds: string[]): void {
  const updateStmt = db.prepare(
    'UPDATE songs SET setlist_order = @order, updated_at = @updated_at WHERE id = @id'
  );
  const now = new Date().toISOString();

  db.transaction(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      updateStmt.run({ order: i, updated_at: now, id: orderedIds[i] });
    }
  })();
}
