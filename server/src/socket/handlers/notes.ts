import type { Server as SocketIOServer, Socket } from 'socket.io';
import type Database from 'better-sqlite3';
import type {
  NoteAddPayload,
  NoteUpdatePayload,
  NoteDeletePayload,
  MigrateSongPayload,
} from '@gig-sheets/shared';
import { ROLES } from '@gig-sheets/shared';
import { getSongById, migrateSong } from '../../db/songs.js';
import { addNote, updateNote, deleteNote, getNotesForSong } from '../../db/notes.js';

export function registerNotesHandlers(
  io: SocketIOServer,
  socket: Socket,
  db: Database.Database
): void {
  socket.on('note_add', (payload: NoteAddPayload) => {
    const song = getSongById(db, payload.song_id);
    if (!song) {
      socket.emit('error', { code: 'SONG_NOT_FOUND', message: 'Song not found' });
      return;
    }
    if (song.master_chart == null) {
      socket.emit('error', { code: 'SONG_NOT_MIGRATED', message: 'Song has no master chart' });
      return;
    }
    if (!ROLES.includes(payload.role)) {
      socket.emit('error', { code: 'NOTE_INVALID', message: 'Invalid role' });
      return;
    }
    const lines = song.master_chart.split('\n');
    if (payload.line_index < 0 || payload.line_index >= lines.length) {
      socket.emit('error', { code: 'NOTE_INVALID', message: 'line_index out of range' });
      return;
    }
    const text = (payload.text ?? '').trim();
    if (!text || text.length > 280) {
      socket.emit('error', { code: 'NOTE_INVALID', message: 'text must be 1–280 characters' });
      return;
    }
    const note = addNote(db, {
      song_id: payload.song_id,
      line_index: payload.line_index,
      role: payload.role,
      text,
    });
    io.emit('note_added', { note });
  });

  socket.on('note_update', (payload: NoteUpdatePayload) => {
    const text = (payload.text ?? '').trim();
    if (!text || text.length > 280) {
      socket.emit('error', { code: 'NOTE_INVALID', message: 'text must be 1–280 characters' });
      return;
    }
    const note = updateNote(db, payload.note_id, text);
    if (!note) {
      socket.emit('error', { code: 'NOTE_NOT_FOUND', message: 'Note not found' });
      return;
    }
    io.emit('note_updated', { note });
  });

  socket.on('note_delete', (payload: NoteDeletePayload) => {
    deleteNote(db, payload.note_id);
    io.emit('note_deleted', { note_id: payload.note_id });
  });

  socket.on('migrate_song', (payload: MigrateSongPayload) => {
    const song = getSongById(db, payload.song_id);
    if (!song) {
      socket.emit('error', { code: 'SONG_NOT_FOUND', message: 'Song not found' });
      return;
    }
    if (song.master_chart != null) {
      socket.emit('error', { code: 'MIGRATION_INVALID', message: 'Song already migrated' });
      return;
    }
    const updated = migrateSong(db, payload.song_id, payload.source_role);
    if (!updated) {
      socket.emit('error', { code: 'MIGRATION_INVALID', message: 'Migration failed' });
      return;
    }
    const notes = getNotesForSong(db, payload.song_id);
    io.emit('song_updated', { song: updated, notes });
  });
}
