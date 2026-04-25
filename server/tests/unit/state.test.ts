import { describe, it, expect, beforeEach } from 'vitest';
import {
  getState,
  addMember,
  removeMember,
  updateMember,
  setCurrentSong,
  setScrollState,
  clearScrollState,
} from '../../src/socket/state.js';

// Reset state between tests by removing all members and clearing state
beforeEach(() => {
  const state = getState();
  // Remove all members
  for (const m of [...state.members]) {
    removeMember(m.socket_id);
  }
  setCurrentSong(null);
  clearScrollState();
});

describe('getState', () => {
  it('returns initial state', () => {
    const state = getState();
    expect(state.members).toEqual([]);
    expect(state.current_song_id).toBeNull();
    expect(state.scroll_state).toBeNull();
  });
});

describe('addMember / removeMember', () => {
  it('adds a member to the state', () => {
    addMember({ socket_id: 'abc', name: 'Cody', role: 'Guitar', joined_at: new Date().toISOString() });
    expect(getState().members).toHaveLength(1);
    expect(getState().members[0]?.name).toBe('Cody');
  });

  it('removes a member by socket_id', () => {
    addMember({ socket_id: 'abc', name: 'Cody', role: 'Guitar', joined_at: new Date().toISOString() });
    removeMember('abc');
    expect(getState().members).toHaveLength(0);
  });

  it('returns the removed member', () => {
    addMember({ socket_id: 'abc', name: 'Cody', role: 'Guitar', joined_at: new Date().toISOString() });
    const removed = removeMember('abc');
    expect(removed?.name).toBe('Cody');
  });

  it('returns undefined when removing non-existent member', () => {
    expect(removeMember('nonexistent')).toBeUndefined();
  });

  it('does not duplicate on reconnect (addMember replaces existing socket_id)', () => {
    addMember({ socket_id: 'abc', name: 'Cody', role: 'Guitar', joined_at: new Date().toISOString() });
    addMember({ socket_id: 'abc', name: 'Cody', role: 'Bass', joined_at: new Date().toISOString() });
    expect(getState().members).toHaveLength(1);
  });
});

describe('updateMember', () => {
  it('updates name and role of an existing member', () => {
    addMember({ socket_id: 'abc', name: 'Cody', role: 'Guitar', joined_at: new Date().toISOString() });
    updateMember('abc', 'Cody Updated', 'Bass');
    expect(getState().members[0]?.role).toBe('Bass');
    expect(getState().members[0]?.name).toBe('Cody Updated');
  });

  it('returns undefined for non-existent member', () => {
    expect(updateMember('nonexistent', 'X', 'Drums')).toBeUndefined();
  });
});

describe('setCurrentSong / clearScrollState', () => {
  it('sets and clears current_song_id', () => {
    setCurrentSong('song-123');
    expect(getState().current_song_id).toBe('song-123');
    setCurrentSong(null);
    expect(getState().current_song_id).toBeNull();
  });
});

describe('setScrollState / clearScrollState', () => {
  it('sets scroll state', () => {
    setScrollState({
      song_id: 'song-1',
      position: 500,
      speed: 1.0,
      controller_id: 'socket-abc',
      updated_at: new Date().toISOString(),
    });
    expect(getState().scroll_state?.position).toBe(500);
    expect(getState().scroll_state?.speed).toBe(1.0);
  });

  it('clears scroll state', () => {
    setScrollState({
      song_id: 'song-1',
      position: 500,
      speed: 1.0,
      controller_id: 'socket-abc',
      updated_at: new Date().toISOString(),
    });
    clearScrollState();
    expect(getState().scroll_state).toBeNull();
  });
});
