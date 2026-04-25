import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Song, NewSong } from '@gig-sheets/shared';

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
  // Build with only defined optional fields (exactOptionalPropertyTypes)
  const optional: Partial<Song> = {};
  if (data.artist !== undefined) optional.artist = data.artist;
  if (data.key !== undefined) optional.key = data.key;
  if (data.tempo !== undefined) optional.tempo = data.tempo;
  if (data.duration !== undefined) optional.duration = data.duration;
  if (data.notes !== undefined) optional.notes = data.notes;
  if (data.chart_guitar !== undefined) optional.chart_guitar = data.chart_guitar;
  if (data.chart_bass !== undefined) optional.chart_bass = data.chart_bass;
  if (data.chart_drums !== undefined) optional.chart_drums = data.chart_drums;
  if (data.chart_vocals !== undefined) optional.chart_vocals = data.chart_vocals;
  if (data.chart_keys !== undefined) optional.chart_keys = data.chart_keys;
  if (data.chart_other !== undefined) optional.chart_other = data.chart_other;

  const song: Song = {
    id: uuidv4(),
    title: data.title,
    setlist_order: maxOrder + 1,
    created_at: now,
    updated_at: now,
    ...optional,
  };

  db.prepare(`
    INSERT INTO songs (
      id, title, artist, key, tempo, duration, notes,
      chart_guitar, chart_bass, chart_drums, chart_vocals, chart_keys, chart_other,
      setlist_order, created_at, updated_at
    ) VALUES (
      @id, @title, @artist, @key, @tempo, @duration, @notes,
      @chart_guitar, @chart_bass, @chart_drums, @chart_vocals, @chart_keys, @chart_other,
      @setlist_order, @created_at, @updated_at
    )
  `).run(song);

  return song;
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
