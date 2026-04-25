import type { Socket, Server } from 'socket.io';
import type Database from 'better-sqlite3';
import {
  getAllSongs,
  createSong,
  updateSong,
  deleteSong,
  reorderSongs,
} from '../../db/songs.js';
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
    io.emit('song_updated', { song: updated });
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
