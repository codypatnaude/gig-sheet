// GigSheet Shared Types
// Used by both client and server. Zero runtime code — types only.

export type Role = 'Guitar' | 'Bass' | 'Drums' | 'Vocals' | 'Keys' | 'Other';
export type ChartRole = 'guitar' | 'bass' | 'drums' | 'vocals' | 'keys' | 'other';

export const ROLES: Role[] = ['Guitar', 'Bass', 'Drums', 'Vocals', 'Keys', 'Other'];
export const CHART_ROLES: ChartRole[] = ['guitar', 'bass', 'drums', 'vocals', 'keys', 'other'];

export const SPEED_VALUES = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0] as const;
export type ScrollSpeed = (typeof SPEED_VALUES)[number];

export interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  duration?: string;
  notes?: string;
  chart_guitar?: string;
  chart_bass?: string;
  chart_drums?: string;
  chart_vocals?: string;
  chart_keys?: string;
  chart_other?: string;
  setlist_order: number;
  created_at: string;
  updated_at: string;
}

export type NewSong = Omit<Song, 'id' | 'created_at' | 'updated_at' | 'setlist_order'>;

export interface Member {
  socket_id: string;
  name: string;
  role: Role;
  joined_at: string;
}

export interface ScrollState {
  song_id: string;
  position: number;
  speed: ScrollSpeed;
  controller_id: string;
  updated_at: string;
}

export interface ServerState {
  members: Member[];
  current_song_id: string | null;
  scroll_state: ScrollState | null;
}

// ── WebSocket Event Payloads ──────────────────────────────────────────────────

// Client → Server
export interface MemberJoinPayload {
  name: string;
  role: Role;
}

export interface MemberUpdatePayload {
  name: string;
  role: Role;
}

export interface SongSelectPayload {
  song_id: string;
}

export interface SetlistReorderPayload {
  ordered_ids: string[];
}

export interface SongCreatePayload {
  song: NewSong;
}

export interface SongUpdatePayload {
  song: Song;
}

export interface SongDeletePayload {
  song_id: string;
}

// [scroll-sync] Scroll events
export interface ScrollUpdatePayload {
  song_id: string;
  position: number;
  speed: ScrollSpeed;
}

// Server → Client
export interface StateSyncPayload {
  setlist: Song[];
  current_song_id: string | null;
  scroll_state: ScrollState | null;
  members: Member[];
}

export interface MemberJoinedPayload {
  member: Member;
}

export interface MemberLeftPayload {
  socket_id: string;
}

export interface MemberUpdatedPayload {
  member: Member;
}

export interface SongSelectedPayload {
  song_id: string;
}

export interface SetlistUpdatedPayload {
  setlist: Song[];
}

export interface SongUpdatedPayload {
  song: Song;
}

// [scroll-sync]
export interface ScrollSyncedPayload {
  song_id: string;
  position: number;
  speed: ScrollSpeed;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
