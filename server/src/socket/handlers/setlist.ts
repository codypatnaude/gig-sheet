import type { Socket, Server } from 'socket.io';
import type Database from 'better-sqlite3';
import {
  getAllSongs,
  createSong,
  updateSong,
  deleteSong,
  reorderSongs,
} from '../../db/songs.js';
import { clampNotes } from '../../db/notes.js';
import type {
  SongCreatePayload,
  SongUpdatePayload,
  SongDeletePayload,
  SetlistReorderPayload,
} from '@gig-sheets/shared';

export function registerSetlistHandlers(io: Server, socket: Socket, db: Database.Database): void {
  socket.on('song_create', (payload: SongCreatePayload) => {
    const { song: data } = payload;
    if (!data?.title || data.title.trim().length === 0) {
      socket.emit('error', { code: 'INVALID_TITLE', message: 'Song title is required.' });
      return;
    }
    const created = createSong(db, { ...data, title: data.title.trim() });
    io.emit('setlist_updated', { setlist: getAllSongs(db) });
    void created;
  });

  socket.on('song_update', (payload: SongUpdatePayload) => {
    const { song } = payload;
    if (!song?.title || song.title.trim().length === 0) {
      socket.emit('error', { code: 'INVALID_TITLE', message: 'Song title is required.' });
      return;
    }
    const updated = updateSong(db, song);

    // If master_chart was updated, clamp any out-of-range notes
    let clampedNotes: ReturnType<typeof clampNotes> | undefined;
    if (updated.master_chart != null) {
      const lineCount = updated.master_chart.length > 0
        ? updated.master_chart.split('\n').length
        : 0;
      if (lineCount > 0) {
        const clamped = clampNotes(db, updated.id, lineCount);
        if (clamped.length > 0) clampedNotes = clamped;
      }
    }

    const broadcastPayload: { song: typeof updated; notes?: typeof clampedNotes } = {
      song: updated,
    };
    if (clampedNotes) broadcastPayload.notes = clampedNotes;
    io.emit('song_updated', broadcastPayload);
  });

  socket.on('song_delete', (payload: SongDeletePayload) => {
    const { song_id } = payload;
    deleteSong(db, song_id);
    io.emit('setlist_updated', { setlist: getAllSongs(db) });
  });

  socket.on('setlist_reorder', (payload: SetlistReorderPayload) => {
    const { ordered_ids } = payload;
    reorderSongs(db, ordered_ids);
    io.emit('setlist_updated', { setlist: getAllSongs(db) });
  });
}
