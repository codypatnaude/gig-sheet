import type { Socket, Server } from 'socket.io';
import type Database from 'better-sqlite3';
import { setCurrentSong } from '../state.js';
import { getNotesForSong } from '../../db/notes.js';
import type { SongSelectPayload } from '@gig-sheets/shared';

export function registerSelectionHandlers(
  io: Server,
  socket: Socket,
  db: Database.Database
): void {
  socket.on('song_select', (payload: SongSelectPayload) => {
    const { song_id } = payload;
    setCurrentSong(song_id);
    const notes = getNotesForSong(db, song_id);
    io.emit('song_selected', { song_id, notes });
  });
}
