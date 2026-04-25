import type { Socket, Server } from 'socket.io';
import type Database from 'better-sqlite3';
import { getAllSongs } from '../../db/songs.js';
import { addMember, removeMember, updateMember, getState } from '../state.js';
import type { MemberJoinPayload, MemberUpdatePayload } from '@gig-sheets/shared';
import { ROLES } from '@gig-sheets/shared';

export function registerMemberHandlers(io: Server, socket: Socket, db: Database.Database): void {
  socket.on('member_join', (payload: MemberJoinPayload) => {
    const { name, role } = payload;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 30) {
      socket.emit('error', { code: 'INVALID_NAME', message: 'Name must be 1–30 characters.' });
      return;
    }
    if (!ROLES.includes(role)) {
      socket.emit('error', { code: 'INVALID_ROLE', message: 'Invalid role.' });
      return;
    }

    const member = {
      socket_id: socket.id,
      name: name.trim(),
      role,
      joined_at: new Date().toISOString(),
    };

    addMember(member);

    // Notify others
    socket.broadcast.emit('member_joined', { member });

    // Send full state to joining client
    const state = getState();
    socket.emit('state_sync', {
      setlist: getAllSongs(db),
      current_song_id: state.current_song_id,
      scroll_state: state.scroll_state,
      members: state.members,
    });
  });

  socket.on('member_update', (payload: MemberUpdatePayload) => {
    const { name, role } = payload;
    const updated = updateMember(socket.id, name?.trim() ?? '', role);
    if (updated) {
      io.emit('member_updated', { member: updated });
    }
  });

  socket.on('disconnect', () => {
    const removed = removeMember(socket.id);
    if (removed) {
      io.emit('member_left', { socket_id: removed.socket_id });
    }
    // If the disconnected client was the scroll controller, clear scroll state
    const state = getState();
    if (state.scroll_state?.controller_id === socket.id) {
      import('../state.js').then(({ clearScrollState }) => {
        clearScrollState();
        io.emit('scroll_stopped');
      });
    }
  });
}
