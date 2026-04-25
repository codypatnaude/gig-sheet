import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestServer,
  connectAndJoin,
  waitForEvent,
  disconnectAll,
  type TestServer,
} from './helpers.js';
import type { ClientSocket } from 'socket.io-client';
import type { ScrollSyncedPayload } from '@gig-sheets/shared';

let server: TestServer;
let clientA: ClientSocket;

beforeEach(async () => {
  server = await createTestServer();
  const { client } = await connectAndJoin(server.port, 'Leader', 'Guitar');
  clientA = client;
});

afterEach(async () => {
  disconnectAll(clientA);
  await server.close();
});

describe('state_sync on fresh connection (simulating reconnect)', () => {
  it('new client receives setlist in state_sync', async () => {
    const { createSong } = await import('../../src/db/songs.js');
    createSong(server.db, { title: 'Pre-existing Song' });

    const { stateSync } = await connectAndJoin(server.port, 'Reconnected', 'Bass');
    expect(stateSync.setlist.some((s) => s.title === 'Pre-existing Song')).toBe(true);
  });

  it('new client receives current_song_id in state_sync', async () => {
    const { createSong } = await import('../../src/db/songs.js');
    const song = createSong(server.db, { title: 'Current Song' });

    // Select that song
    const selectPromise = waitForEvent(clientA, 'song_selected', 1000);
    clientA.emit('song_select', { song_id: song.id });
    await selectPromise;

    const { stateSync } = await connectAndJoin(server.port, 'Reconnected', 'Drums');
    expect(stateSync.current_song_id).toBe(song.id);
  });

  it('new client receives active scroll_state in state_sync', async () => {
    // Controller starts scrolling
    const { client: receiver } = await connectAndJoin(server.port, 'Receiver', 'Bass');
    const syncPromise = waitForEvent<ScrollSyncedPayload>(receiver, 'scroll_synced', 1000);
    clientA.emit('scroll_update', { song_id: 'song-abc', position: 850, speed: 1.5 });
    await syncPromise;

    const { stateSync } = await connectAndJoin(server.port, 'Reconnected', 'Keys');
    expect(stateSync.scroll_state).not.toBeNull();
    expect(stateSync.scroll_state?.position).toBe(850);
    expect(stateSync.scroll_state?.speed).toBe(1.5);

    disconnectAll(receiver);
  });

  it('new client receives null scroll_state when no scroll is active', async () => {
    const { stateSync } = await connectAndJoin(server.port, 'Reconnected', 'Vocals');
    expect(stateSync.scroll_state).toBeNull();
  });
});
