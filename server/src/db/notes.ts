import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Note, Role } from '@gig-sheets/shared';

export function getNotesForSong(db: Database.Database, songId: string): Note[] {
  return db
    .prepare('SELECT * FROM notes WHERE song_id = ? ORDER BY line_index ASC, created_at ASC')
    .all(songId) as Note[];
}

export function addNote(
  db: Database.Database,
  data: { song_id: string; line_index: number; role: Role; text: string }
): Note {
  const now = new Date().toISOString();
  const note: Note = {
    id: uuidv4(),
    song_id: data.song_id,
    line_index: data.line_index,
    role: data.role,
    text: data.text,
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    'INSERT INTO notes (id, song_id, line_index, role, text, created_at, updated_at) VALUES (@id, @song_id, @line_index, @role, @text, @created_at, @updated_at)'
  ).run(note);
  return note;
}

export function updateNote(db: Database.Database, noteId: string, text: string): Note | undefined {
  const now = new Date().toISOString();
  db.prepare('UPDATE notes SET text = ?, updated_at = ? WHERE id = ?').run(text, now, noteId);
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as Note | undefined;
}

export function deleteNote(db: Database.Database, noteId: string): void {
  db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
}

// Clamp any notes whose line_index >= newLineCount to newLineCount - 1.
// Returns only the notes that were actually moved (not those already at that index).
export function clampNotes(
  db: Database.Database,
  songId: string,
  newLineCount: number
): Note[] {
  if (newLineCount <= 0) return [];
  const maxIndex = newLineCount - 1;
  const now = new Date().toISOString();
  // Collect IDs of notes that will be clamped BEFORE updating
  const toClamp = db
    .prepare('SELECT id FROM notes WHERE song_id = ? AND line_index > ?')
    .all(songId, maxIndex) as Array<{ id: string }>;
  if (toClamp.length === 0) return [];
  db.prepare(
    'UPDATE notes SET line_index = ?, updated_at = ? WHERE song_id = ? AND line_index > ?'
  ).run(maxIndex, now, songId, maxIndex);
  const ids = toClamp.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  return db
    .prepare(`SELECT * FROM notes WHERE id IN (${placeholders})`)
    .all(...ids) as Note[];
}
