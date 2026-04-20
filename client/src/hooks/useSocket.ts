import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Member,
  Song,
  ScrollState,
  StateSyncPayload,
  MemberJoinedPayload,
  MemberLeftPayload,
  SetlistUpdatedPayload,
  SongUpdatedPayload,
  SongSelectedPayload,
  ScrollSyncedPayload,
  Role,
} from '@gig-sheets/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface AppState {
  member: { name: string; role: Role } | null;
  members: Member[];
  setlist: Song[];
  currentSongId: string | null;
  scrollState: ScrollState | null;
  connectionStatus: ConnectionStatus;
}

const LS_NAME_KEY = 'gigsheet_member_name';
const LS_ROLE_KEY = 'gigsheet_member_role';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  const [state, setState] = useState<AppState>(() => {
    const name = localStorage.getItem(LS_NAME_KEY);
    const role = localStorage.getItem(LS_ROLE_KEY) as Role | null;
    return {
      member: name && role ? { name, role } : null,
      members: [],
      setlist: [],
      currentSongId: null,
      scrollState: null,
      connectionStatus: 'connecting',
    };
  });

  const join = useCallback((name: string, role: Role) => {
    localStorage.setItem(LS_NAME_KEY, name);
    localStorage.setItem(LS_ROLE_KEY, role);
    setState((s) => ({ ...s, member: { name, role } }));
    socketRef.current?.emit('member_join', { name, role });
  }, []);

  useEffect(() => {
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState((s) => ({ ...s, connectionStatus: 'connected' }));
      // Re-join on reconnect if we have stored identity
      const name = localStorage.getItem(LS_NAME_KEY);
      const role = localStorage.getItem(LS_ROLE_KEY) as Role | null;
      if (name && role) {
        socket.emit('member_join', { name, role });
      }
    });

    socket.on('disconnect', () => {
      setState((s) => ({ ...s, connectionStatus: 'offline' }));
    });

    socket.on('connect_error', () => {
      setState((s) => ({ ...s, connectionStatus: 'reconnecting' }));
    });

    socket.io.on('reconnect_attempt', () => {
      setState((s) => ({ ...s, connectionStatus: 'reconnecting' }));
    });

    socket.on('state_sync', (payload: StateSyncPayload) => {
      setState((s) => ({
        ...s,
        setlist: payload.setlist,
        currentSongId: payload.current_song_id,
        scrollState: payload.scroll_state,
        members: payload.members,
      }));
    });

    socket.on('member_joined', (payload: MemberJoinedPayload) => {
      setState((s) => {
        const exists = s.members.some((m) => m.socket_id === payload.member.socket_id);
        if (exists) return s;
        return { ...s, members: [...s.members, payload.member] };
      });
    });

    socket.on('member_left', (payload: MemberLeftPayload) => {
      setState((s) => ({
        ...s,
        members: s.members.filter((m) => m.socket_id !== payload.socket_id),
      }));
    });

    socket.on('setlist_updated', (payload: SetlistUpdatedPayload) => {
      setState((s) => ({ ...s, setlist: payload.setlist }));
    });

    socket.on('song_updated', (payload: SongUpdatedPayload) => {
      setState((s) => ({
        ...s,
        setlist: s.setlist.map((song) =>
          song.id === payload.song.id ? payload.song : song
        ),
      }));
    });

    socket.on('song_selected', (payload: SongSelectedPayload) => {
      setState((s) => ({ ...s, currentSongId: payload.song_id }));
    });

    // [scroll-sync]
    socket.on('scroll_synced', (payload: ScrollSyncedPayload) => {
      setState((s) => ({
        ...s,
        scrollState: {
          song_id: payload.song_id,
          position: payload.position,
          speed: payload.speed,
          controller_id: socket.id ?? '',
          updated_at: new Date().toISOString(),
        },
      }));
    });

    socket.on('scroll_stopped', () => {
      setState((s) => ({ ...s, scrollState: null }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef, state, join };
}
