import { describe, it, expect, beforeEach } from 'vitest';
import { initDb } from '../../src/db/schema.js';
import { createSong } from '../../src/db/songs.js';
import { addNote, getNotesForSong, updateNote, deleteNote, clampNotes } from '../../src/db/notes.js';
import type Database from 'better-sqlite3';

let db: Database.Database;

const SONG_DATA = {
  title: 'Test Song',
  master_chart: 'line0\nline1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9',
};

beforeEach(() => {
  db = initDb(':memory:');
});

describe('addNote', () => {
  it('inserts a note and returns it with generated id and timestamps', () => {
    const song = createSong(db, SONG_DATA);
    const note = addNote(db, { song_id: song.id, line_index: 2, role: 'Guitar', text: 'palm mute' });
    expect(note.id).toBeTruthy();
    expect(note.song_id).toBe(song.id);
    expect(note.line_index).toBe(2);
    expect(note.role).toBe('Guitar');
    expect(note.text).toBe('palm mute');
    expect(note.created_at).toBeTruthy();
    expect(note.updated_at).toBeTruthy();
  });

  it('allows multiple notes on the same line from different roles', () => {
    const song = createSong(db, SONG_DATA);
    const n1 = addNote(db, { song_id: song.id, line_index: 0, role: 'Guitar', text: 'A' });
    const n2 = addNote(db, { song_id: song.id, line_index: 0, role: 'Bass', text: 'B' });
    const notes = getNotesForSong(db, song.id);
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.id)).toContain(n1.id);
    expect(notes.map((n) => n.id)).toContain(n2.id);
  });
});

describe('getNotesForSong', () => {
  it('returns all notes for a song ordered by line_index then created_at', () => {
    const song = createSong(db, SONG_DATA);
    addNote(db, { song_id: song.id, line_index: 5, role: 'Drums', text: 'd' });
    addNote(db, { song_id: song.id, line_index: 1, role: 'Bass', text: 'b' });
    addNote(db, { song_id: song.id, line_index: 3, role: 'Vocals', text: 'v' });
    const notes = getNotesForSong(db, song.id);
    expect(notes.map((n) => n.line_index)).toEqual([1, 3, 5]);
  });

  it('returns empty array for song with no notes', () => {
    const song = createSong(db, SONG_DATA);
    expect(getNotesForSong(db, song.id)).toEqual([]);
  });

  it('does not return notes from other songs', () => {
    const song1 = createSong(db, SONG_DATA);
    const song2 = createSong(db, { title: 'Other', master_chart: 'line0' });
    addNote(db, { song_id: song2.id, line_index: 0, role: 'Guitar', text: 'other' });
    expect(getNotesForSong(db, song1.id)).toHaveLength(0);
  });
});

describe('updateNote', () => {
  it('updates text and bumps updated_at', () => {
    const song = createSong(db, SONG_DATA);
    const note = addNote(db, { song_id: song.id, line_index: 0, role: 'Guitar', text: 'orig' });
    const updated = updateNote(db, note.id, 'revised');
    expect(updated?.text).toBe('revised');
    expect(updated?.updated_at).toBeTruthy();
  });

  it('returns undefined for unknown note_id', () => {
    expect(updateNote(db, 'nonexistent', 'x')).toBeUndefined();
  });
});

describe('deleteNote', () => {
  it('removes the note from the database', () => {
    const song = createSong(db, SONG_DATA);
    const note = addNote(db, { song_id: song.id, line_index: 0, role: 'Guitar', text: 'gone' });
    deleteNote(db, note.id);
    expect(getNotesForSong(db, song.id)).toHaveLength(0);
  });

  it('is a no-op for unknown note_id', () => {
    expect(() => deleteNote(db, 'nonexistent')).not.toThrow();
  });
});

describe('clampNotes', () => {
  it('clamps notes with line_index >= newLineCount to newLineCount - 1', () => {
    const song = createSong(db, SONG_DATA);
    addNote(db, { song_id: song.id, line_index: 8, role: 'Guitar', text: 'deep' });
    addNote(db, { song_id: song.id, line_index: 9, role: 'Bass', text: 'deeper' });
    addNote(db, { song_id: song.id, line_index: 1, role: 'Drums', text: 'safe' });

    const clamped = clampNotes(db, song.id, 3); // 10-line chart shrinks to 3 lines
    expect(clamped).toHaveLength(2);
    expect(clamped.every((n) => n.line_index === 2)).toBe(true);

    const all = getNotesForSong(db, song.id);
    const safeNote = all.find((n) => n.role === 'Drums');
    expect(safeNote?.line_index).toBe(1); // untouched
  });

  it('returns empty array when no notes need clamping', () => {
    const song = createSong(db, SONG_DATA);
    addNote(db, { song_id: song.id, line_index: 0, role: 'Guitar', text: 'ok' });
    const clamped = clampNotes(db, song.id, 10);
    expect(clamped).toHaveLength(0);
  });

  it('handles newLineCount of 1 (clamps all notes to line 0)', () => {
    const song = createSong(db, SONG_DATA);
    addNote(db, { song_id: song.id, line_index: 5, role: 'Guitar', text: 'x' });
    const clamped = clampNotes(db, song.id, 1);
    expect(clamped[0]?.line_index).toBe(0);
  });
});
