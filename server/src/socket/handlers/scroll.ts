// [scroll-sync] Scroll sync handlers — constitution Principle II
// Any change to this file requires a [scroll-sync] tag in the commit message
// and must be accompanied by passing integration tests in scroll-sync.test.ts

import type { Socket, Server } from 'socket.io';
import { setScrollState, clearScrollState } from '../state.js';
import type { ScrollUpdatePayload } from '@gig-sheets/shared';
import { SPEED_VALUES } from '@gig-sheets/shared';

export function registerScrollHandlers(io: Server, socket: Socket): void {
  // [scroll-sync] Receive scroll position from controlling client, relay to all others
  socket.on('scroll_update', (payload: ScrollUpdatePayload) => {
    const { song_id, position, speed } = payload;

    if (!SPEED_VALUES.includes(speed)) {
      socket.emit('error', { code: 'INVALID_SPEED', message: 'Invalid scroll speed.' });
      return;
    }

    const scrollState = {
      song_id,
      position,
      speed,
      controller_id: socket.id,
      updated_at: new Date().toISOString(),
    };

    setScrollState(scrollState);

    // Relay to all clients except the sender — do NOT buffer or batch
    socket.broadcast.emit('scroll_synced', { song_id, position, speed });
  });

  // [scroll-sync] Controlling client stopped — notify all
  socket.on('scroll_stop', () => {
    clearScrollState();
    io.emit('scroll_stopped');
  });
}
