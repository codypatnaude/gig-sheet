import type { Member, ScrollState, ServerState, Role } from '@gig-sheets/shared';

const state: ServerState = {
  members: [],
  current_song_id: null,
  scroll_state: null,
};

export function getState(): Readonly<ServerState> {
  return state;
}

export function addMember(member: Member): void {
  removeMember(member.socket_id); // avoid duplicates on reconnect
  state.members.push(member);
}

export function removeMember(socketId: string): Member | undefined {
  const idx = state.members.findIndex((m) => m.socket_id === socketId);
  if (idx === -1) return undefined;
  const [removed] = state.members.splice(idx, 1);
  return removed;
}

export function updateMember(socketId: string, name: string, role: Role): Member | undefined {
  const member = state.members.find((m) => m.socket_id === socketId);
  if (!member) return undefined;
  member.name = name;
  member.role = role;
  return { ...member };
}

export function setCurrentSong(songId: string | null): void {
  state.current_song_id = songId;
}

export function setScrollState(scrollState: ScrollState): void {
  state.scroll_state = scrollState;
}

export function clearScrollState(): void {
  state.scroll_state = null;
}
