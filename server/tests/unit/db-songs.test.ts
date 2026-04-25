import { describe, it, expect, beforeEach } from 'vitest';
import { initDb } from '../../src/db/schema.js';
import {
  getAllSongs,
  getSongById,
  createSong,
  updateSong,
  deleteSong,
  reorderSongs,
} from '../../src/db/songs.js';
import { seedIfEmpty } from '../../src/db/seed.js';
import type Database from 'better-sqlite3';

let db: Database.Database;

beforeEach(() => {
  db = initDb(':memory:');
});

describe('getAllSongs', () => {
  it('returns empty array when no songs exist', () => {
    expect(getAllSongs(db)).toEqual([]);
  });

  it('returns songs in setlist_order', () => {
    createSong(db, { title: 'B Song' });
    createSong(db, { title: 'A Song' });
    const songs = getAllSongs(db);
    expect(songs[0]?.title).toBe('B Song');
    expect(songs[1]?.title).toBe('A Song');
  });
});

describe('createSong', () => {
  it('creates a song with required title', () => {
    const song = createSong(db, { title: 'Test Song' });
    expect(song.id).toBeTruthy();
    expect(song.title).toBe('Test Song');
    expect(song.setlist_order).toBe(0);
    expect(song.created_at).toBeTruthy();
    expect(song.updated_at).toBeTruthy();
  });

  it('increments setlist_order for each new song', () => {
    const s1 = createSong(db, { title: 'Song 1' });
    const s2 = createSong(db, { title: 'Song 2' });
    const s3 = createSong(db, { title: 'Song 3' });
    expect(s1.setlist_order).toBe(0);
    expect(s2.setlist_order).toBe(1);
    expect(s3.setlist_order).toBe(2);
  });

  it('stores all optional metadata fields', () => {
    const song = createSong(db, {
      title: 'Full Song',
      artist: 'Test Artist',
      key: 'G',
      tempo: 120,
      duration: '3:30',
      notes: 'Some notes',
      chart_guitar: 'G D Em C',
      chart_bass: 'Root notes',
      chart_drums: 'Standard beat',
      chart_vocals: 'La la la',
      chart_keys: 'Pad',
      chart_other: 'Percussion',
    });
    expect(song.artist).toBe('Test Artist');
    expect(song.key).toBe('G');
    expect(song.tempo).toBe(120);
    expect(song.chart_guitar).toBe('G D Em C');
    expect(song.chart_vocals).toBe('La la la');
  });
});

describe('getSongById', () => {
  it('returns song by id', () => {
    const created = createSong(db, { title: 'Find Me' });
    const found = getSongById(db, created.id);
    expect(found?.title).toBe('Find Me');
  });

  it('returns undefined for non-existent id', () => {
    expect(getSongById(db, 'nonexistent')).toBeUndefined();
  });
});

describe('updateSong', () => {
  it('updates mutable fields and bumps updated_at', async () => {
    const song = createSong(db, { title: 'Old Title' });
    await new Promise((r) => setTimeout(r, 5));
    const updated = updateSong(db, { ...song, title: 'New Title', chart_guitar: 'G C D' });
    expect(updated.title).toBe('New Title');
    expect(updated.chart_guitar).toBe('G C D');
    expect(updated.updated_at > song.updated_at).toBe(true);
  });

  it('persists update to database', () => {
    const song = createSong(db, { title: 'Before' });
    updateSong(db, { ...song, title: 'After' });
    expect(getSongById(db, song.id)?.title).toBe('After');
  });
});

describe('deleteSong', () => {
  it('removes the song from the database', () => {
    const song = createSong(db, { title: 'To Delete' });
    deleteSong(db, song.id);
    expect(getSongById(db, song.id)).toBeUndefined();
  });

  it('renumbers remaining songs to maintain contiguous order', () => {
    const s1 = createSong(db, { title: 'Song 1' });
    const s2 = createSong(db, { title: 'Song 2' });
    const s3 = createSong(db, { title: 'Song 3' });
    deleteSong(db, s2.id);
    const remaining = getAllSongs(db);
    expect(remaining).toHaveLength(2);
    expect(remaining[0]?.id).toBe(s1.id);
    expect(remaining[0]?.setlist_order).toBe(0);
    expect(remaining[1]?.id).toBe(s3.id);
    expect(remaining[1]?.setlist_order).toBe(1);
  });
});

describe('reorderSongs', () => {
  it('updates setlist_order to match provided order', () => {
    const s1 = createSong(db, { title: 'Song 1' });
    const s2 = createSong(db, { title: 'Song 2' });
    const s3 = createSong(db, { title: 'Song 3' });
    reorderSongs(db, [s3.id, s1.id, s2.id]);
    const songs = getAllSongs(db);
    expect(songs[0]?.id).toBe(s3.id);
    expect(songs[1]?.id).toBe(s1.id);
    expect(songs[2]?.id).toBe(s2.id);
  });
});

describe('seedIfEmpty', () => {
  it('inserts 3 demo songs when database is empty', () => {
    seedIfEmpty(db);
    const songs = getAllSongs(db);
    expect(songs).toHaveLength(3);
    expect(songs.map((s) => s.title)).toContain("Last Call at Lindy's");
    expect(songs.map((s) => s.title)).toContain('Meridian');
    expect(songs.map((s) => s.title)).toContain('Copper Wire');
  });

  it('does NOT insert when songs already exist', () => {
    createSong(db, { title: 'Existing Song' });
    seedIfEmpty(db);
    const songs = getAllSongs(db);
    expect(songs).toHaveLength(1);
    expect(songs[0]?.title).toBe('Existing Song');
  });

  it('demo songs have correct metadata', () => {
    seedIfEmpty(db);
    const songs = getAllSongs(db);
    const lindy = songs.find((s) => s.title === "Last Call at Lindy's");
    expect(lindy?.artist).toBe('The Hollow Frets');
    expect(lindy?.key).toBe('A');
    expect(lindy?.tempo).toBe(112);
    expect(lindy?.chart_guitar).toBeTruthy();
  });
});
