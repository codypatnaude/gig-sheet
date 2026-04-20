import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestServer,
  connectAndJoin,
  waitForEvent,
  disconnectAll,
  type TestServer,
} from './helpers.js';
import type { ClientSocket } from 'socket.io-client';
import type {
  SetlistUpdatedPayload,
  SongUpdatedPayload,
  SongSelectedPayload,
} from '@gig-sheets/shared';
import { seedIfEmpty } from '../../src/db/seed.js';

let server: TestServer;
let clientA: ClientSocket;
let clientB: ClientSocket;

beforeEach(async () => {
  server = await createTestServer();
  const [a, b] = await Promise.all([
    connectAndJoin(server.port, 'Leader', 'Guitar'),
    connectAndJoin(server.port, 'Member', 'Bass'),
  ]);
  clientA = a.client;
  clientB = b.client;
});

afterEach(async () => {
  disconnectAll(clientA, clientB);
  await server.close();
});

describe('song_create broadcast', () => {
  it('setlist_updated broadcast to all clients within 1000ms', async () => {
    const aPromise = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    const bPromise = waitForEvent<SetlistUpdatedPayload>(clientB, 'setlist_updated', 1000);

    clientA.emit('song_create', { song: { title: 'New Song', key: 'G' } });

    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.setlist.some((s) => s.title === 'New Song')).toBe(true);
    expect(b.setlist.some((s) => s.title === 'New Song')).toBe(true);
  });

  it('rejects creation with empty title', async () => {
    const errorPromise = waitForEvent(clientA, 'error', 500);
    clientA.emit('song_create', { song: { title: '' } });
    const err = await errorPromise;
    expect((err as { code: string }).code).toBe('INVALID_TITLE');
  });
});

describe('song_update broadcast', () => {
  it('song_updated broadcast to all clients within 1000ms', async () => {
    // First create a song
    const createAPromise = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    clientA.emit('song_create', { song: { title: 'Update Me' } });
    const { setlist } = await createAPromise;
    const song = setlist[0]!;

    const aPromise = waitForEvent<SongUpdatedPayload>(clientA, 'song_updated', 1000);
    const bPromise = waitForEvent<SongUpdatedPayload>(clientB, 'song_updated', 1000);

    clientA.emit('song_update', { song: { ...song, title: 'Updated Title' } });

    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.song.title).toBe('Updated Title');
    expect(b.song.title).toBe('Updated Title');
  });
});

describe('song_delete broadcast', () => {
  it('setlist_updated broadcast to all clients after deletion', async () => {
    // Wait for BOTH clients to consume the create event before registering delete listeners
    const createAPromise = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    const createBPromise = waitForEvent<SetlistUpdatedPayload>(clientB, 'setlist_updated', 1000);
    clientA.emit('song_create', { song: { title: 'Delete Me' } });
    const [{ setlist }] = await Promise.all([createAPromise, createBPromise]);
    const songId = setlist[0]!.id;

    const aPromise = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    const bPromise = waitForEvent<SetlistUpdatedPayload>(clientB, 'setlist_updated', 1000);
    clientA.emit('song_delete', { song_id: songId });

    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.setlist.some((s) => s.id === songId)).toBe(false);
    expect(b.setlist.some((s) => s.id === songId)).toBe(false);
  });
});

describe('setlist_reorder broadcast', () => {
  it('setlist_updated broadcast with new order after reorder', async () => {
    // Create two songs sequentially; drain events from BOTH clients before each next step
    const p1a = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    const p1b = waitForEvent<SetlistUpdatedPayload>(clientB, 'setlist_updated', 1000);
    clientA.emit('song_create', { song: { title: 'Song A' } });
    await Promise.all([p1a, p1b]);

    const p2a = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    const p2b = waitForEvent<SetlistUpdatedPayload>(clientB, 'setlist_updated', 1000);
    clientA.emit('song_create', { song: { title: 'Song B' } });
    const [{ setlist }] = await Promise.all([p2a, p2b]);

    const idA = setlist.find((s) => s.title === 'Song A')!.id;
    const idB = setlist.find((s) => s.title === 'Song B')!.id;

    const aPromise = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    const bPromise = waitForEvent<SetlistUpdatedPayload>(clientB, 'setlist_updated', 1000);
    clientA.emit('setlist_reorder', { ordered_ids: [idB, idA] });

    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.setlist[0]!.id).toBe(idB);
    expect(a.setlist[1]!.id).toBe(idA);
    expect(b.setlist[0]!.id).toBe(idB);
  });
});

describe('song_select sync', () => {
  it('song_selected broadcast to all clients within 1000ms', async () => {
    const createPromise = waitForEvent<SetlistUpdatedPayload>(clientA, 'setlist_updated', 1000);
    clientA.emit('song_create', { song: { title: 'Select Me' } });
    const { setlist } = await createPromise;
    const songId = setlist[0]!.id;

    const aPromise = waitForEvent<SongSelectedPayload>(clientA, 'song_selected', 1000);
    const bPromise = waitForEvent<SongSelectedPayload>(clientB, 'song_selected', 1000);
    clientA.emit('song_select', { song_id: songId });

    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.song_id).toBe(songId);
    expect(b.song_id).toBe(songId);
  });
});

describe('demo content', () => {
  it('state_sync setlist includes demo songs when seeded', async () => {
    seedIfEmpty(server.db);
    const { stateSync } = await connectAndJoin(server.port, 'Test', 'Other');

    const titles = stateSync.setlist.map((s) => s.title);
    expect(titles).toContain("Last Call at Lindy's");
    expect(titles).toContain('Meridian');
    expect(titles).toContain('Copper Wire');
  });
});
