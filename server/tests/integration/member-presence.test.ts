import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestServer,
  createClient,
  connectAndJoin,
  waitForConnect,
  waitForEvent,
  disconnectAll,
  type TestServer,
} from './helpers.js';
import type { ClientSocket } from 'socket.io-client';
import type { StateSyncPayload, MemberJoinedPayload, MemberLeftPayload } from '@gig-sheets/shared';

let server: TestServer;
let clientA: ClientSocket;
let clientB: ClientSocket;

beforeEach(async () => {
  server = await createTestServer();
  clientA = createClient(server.port);
  clientB = createClient(server.port);
  await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);
});

afterEach(async () => {
  disconnectAll(clientA, clientB);
  await server.close();
});

describe('member_join → state_sync', () => {
  it('joining client receives full state_sync on member_join', async () => {
    const stateSyncPromise = waitForEvent<StateSyncPayload>(clientA, 'state_sync', 2000);
    clientA.emit('member_join', { name: 'Cody', role: 'Guitar' });
    const stateSync = await stateSyncPromise;

    expect(stateSync.setlist).toBeDefined();
    expect(Array.isArray(stateSync.setlist)).toBe(true);
    expect(stateSync.current_song_id).toBeNull();
    expect(stateSync.scroll_state).toBeNull();
    expect(Array.isArray(stateSync.members)).toBe(true);
  });

  it('other clients receive member_joined within 1000ms', async () => {
    const memberJoinedPromise = waitForEvent<MemberJoinedPayload>(clientB, 'member_joined', 1000);
    clientA.emit('member_join', { name: 'Cody', role: 'Guitar' });
    const payload = await memberJoinedPromise;

    expect(payload.member.name).toBe('Cody');
    expect(payload.member.role).toBe('Guitar');
    expect(payload.member.socket_id).toBe(clientA.id);
  });

  it('state_sync includes all currently connected members', async () => {
    // ClientA joins first
    const aSync = waitForEvent<StateSyncPayload>(clientA, 'state_sync', 2000);
    clientA.emit('member_join', { name: 'Cody', role: 'Guitar' });
    await aSync;

    // ClientB joins second — their state_sync should include ClientA
    const bSync = waitForEvent<StateSyncPayload>(clientB, 'state_sync', 2000);
    clientB.emit('member_join', { name: 'Mia', role: 'Vocals' });
    const stateSync = await bSync;

    expect(stateSync.members.some((m) => m.name === 'Cody')).toBe(true);
    expect(stateSync.members.some((m) => m.name === 'Mia')).toBe(true);
  });
});

describe('member disconnect → member_left', () => {
  it('remaining clients receive member_left when a member disconnects', async () => {
    const aId = clientA.id;
    // Both join
    const aSync = waitForEvent<StateSyncPayload>(clientA, 'state_sync', 2000);
    const bSync = waitForEvent<StateSyncPayload>(clientB, 'state_sync', 2000);
    clientA.emit('member_join', { name: 'Cody', role: 'Guitar' });
    clientB.emit('member_join', { name: 'Mia', role: 'Vocals' });
    await Promise.all([aSync, bSync]);

    const memberLeftPromise = waitForEvent<MemberLeftPayload>(clientB, 'member_left', 2000);
    clientA.disconnect();
    const payload = await memberLeftPromise;

    expect(payload.socket_id).toBe(aId);
  });
});

describe('member_join validation', () => {
  it('rejects empty name', async () => {
    const errorPromise = waitForEvent(clientA, 'error', 500);
    clientA.emit('member_join', { name: '', role: 'Guitar' });
    const err = await errorPromise;
    expect((err as { code: string }).code).toBe('INVALID_NAME');
  });

  it('rejects name over 30 characters', async () => {
    const errorPromise = waitForEvent(clientA, 'error', 500);
    clientA.emit('member_join', { name: 'A'.repeat(31), role: 'Guitar' });
    await errorPromise;
  });

  it('rejects invalid role', async () => {
    const errorPromise = waitForEvent(clientA, 'error', 500);
    clientA.emit('member_join', { name: 'Valid Name', role: 'InvalidRole' as never });
    await errorPromise;
  });
});
