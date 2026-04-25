import type { Socket, Server } from 'socket.io';
import { setCurrentSong } from '../state.js';
import type { SongSelectPayload } from '@gig-sheets/shared';

export function registerSelectionHandlers(io: Server, socket: Socket): void {
  socket.on('song_select', (payload: SongSelectPayload) => {
    const { song_id } = payload;
    setCurrentSong(song_id);
    io.emit('song_selected', { song_id });
  });
}
