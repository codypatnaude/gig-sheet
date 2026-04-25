// [scroll-sync] Scroll sync integration tests
// Constitution Principle II: These tests MUST pass before scroll implementation is complete.
// Any change to scroll handlers must keep these tests green.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestServer,
  connectAndJoin,
  waitForEvent,
  disconnectAll,
  type TestServer,
} from './helpers.js';
import type { ClientSocket } from 'socket.io-client';
import type { ScrollSyncedPayload, StateSyncPayload } from '@gig-sheets/shared';

let server: TestServer;
let controller: ClientSocket;
let receiver: ClientSocket;

beforeEach(async () => {
  server = await createTestServer();
  const [c, r] = await Promise.all([
    connectAndJoin(server.port, 'Controller', 'Guitar'),
    connectAndJoin(server.port, 'Receiver', 'Bass'),
  ]);
  controller = c.client;
  receiver = r.client;
});

afterEach(async () => {
  disconnectAll(controller, receiver);
  await server.close();
});

describe('scroll_synced latency', () => {
  it('receiver gets scroll_synced within 1000ms of controller emitting scroll_update', async () => {
    const start = Date.now();
    const syncPromise = waitForEvent<ScrollSyncedPayload>(receiver, 'scroll_synced', 1000);
    controller.emit('scroll_update', { song_id: 'song-1', position: 100, speed: 1.0 });
    const payload = await syncPromise;
    const elapsed = Date.now() - start;

    expect(payload.song_id).toBe('song-1');
    expect(payload.position).toBe(100);
    expect(payload.speed).toBe(1.0);
    expect(elapsed).toBeLessThan(1000);
  });

  it('controller does NOT receive scroll_synced for its own updates', async () => {
    let controllerGotSync = false;
    controller.on('scroll_synced', () => {
      controllerGotSync = true;
    });

    const syncPromise = waitForEvent<ScrollSyncedPayload>(receiver, 'scroll_synced', 1000);
    controller.emit('scroll_update', { song_id: 'song-1', position: 200, speed: 1.0 });
    await syncPromise;
    await new Promise((r) => setTimeout(r, 200));

    expect(controllerGotSync).toBe(false);
  });
});

describe('scroll position accuracy — no drift', () => {
  it('position broadcast matches exactly what controller sent (no drift)', async () => {
    const positions = [0, 100, 250, 500, 800, 1200, 1600];
    const received: number[] = [];

    receiver.on('scroll_synced', (p: ScrollSyncedPayload) => received.push(p.position));

    for (const pos of positions) {
      controller.emit('scroll_update', { song_id: 'song-1', position: pos, speed: 1.0 });
      await new Promise((r) => setTimeout(r, 30));
    }
    await new Promise((r) => setTimeout(r, 200));

    expect(received.length).toBeGreaterThanOrEqual(positions.length - 1);
    // Last received position must exactly match last sent — absolute broadcast, no drift
    const lastSent = positions[positions.length - 1]!;
    const lastReceived = received[received.length - 1]!;
    expect(Math.abs(lastReceived - lastSent)).toBe(0);
  });

  it('simulated long scroll: final drift is 0px (absolute position broadcast)', async () => {
    const TICK_COUNT = 60;
    const POSITION_STEP = 50;
    let lastReceivedPosition = -1;

    receiver.on('scroll_synced', (p: ScrollSyncedPayload) => {
      lastReceivedPosition = p.position;
    });

    for (let i = 0; i < TICK_COUNT; i++) {
      const position = i * POSITION_STEP;
      controller.emit('scroll_update', { song_id: 'song-1', position, speed: 1.0 });
      await new Promise((r) => setTimeout(r, 20));
    }
    await new Promise((r) => setTimeout(r, 300));

    const finalControllerPosition = (TICK_COUNT - 1) * POSITION_STEP;
    const drift = Math.abs(lastReceivedPosition - finalControllerPosition);

    // Absolute position broadcast: drift MUST be 0
    expect(drift).toBe(0);
    expect(lastReceivedPosition).toBe(finalControllerPosition);
  });
});

describe('scroll_stopped broadcast', () => {
  it('all clients receive scroll_stopped within 1000ms of scroll_stop', async () => {
    const syncPromise = waitForEvent<ScrollSyncedPayload>(receiver, 'scroll_synced', 1000);
    controller.emit('scroll_update', { song_id: 'song-1', position: 500, speed: 1.5 });
    await syncPromise;

    const receiverStopPromise = waitForEvent(receiver, 'scroll_stopped', 1000);
    const controllerStopPromise = waitForEvent(controller, 'scroll_stopped', 1000);
    controller.emit('scroll_stop');
    await Promise.all([receiverStopPromise, controllerStopPromise]);
  });

  it('server clears scroll_state after scroll_stop', async () => {
    const syncPromise = waitForEvent<ScrollSyncedPayload>(receiver, 'scroll_synced', 1000);
    controller.emit('scroll_update', { song_id: 'song-1', position: 500, speed: 1.0 });
    await syncPromise;

    const stopPromise = waitForEvent(receiver, 'scroll_stopped', 1000);
    controller.emit('scroll_stop');
    await stopPromise;
    await new Promise((r) => setTimeout(r, 100));

    // A new client joining should receive null scroll_state
    const { client: newClient, stateSync } = await connectAndJoin(server.port, 'Newbie', 'Keys');
    expect(stateSync.scroll_state).toBeNull();
    disconnectAll(newClient);
  });
});

describe('reconnect scroll state recovery', () => {
  it('reconnecting client receives current scroll_state in state_sync', async () => {
    // Controller starts scrolling
    const syncPromise = waitForEvent<ScrollSyncedPayload>(receiver, 'scroll_synced', 1000);
    controller.emit('scroll_update', { song_id: 'song-1', position: 750, speed: 2.0 });
    await syncPromise;
    await new Promise((r) => setTimeout(r, 50));

    // New client connects (simulating reconnect)
    const { client: reconnected, stateSync } = await connectAndJoin(
      server.port,
      'Reconnected',
      'Vocals'
    );

    expect(stateSync.scroll_state).not.toBeNull();
    expect(stateSync.scroll_state?.song_id).toBe('song-1');
    expect(stateSync.scroll_state?.position).toBe(750);
    expect(stateSync.scroll_state?.speed).toBe(2.0);

    disconnectAll(reconnected);
  });
});

describe('speed values', () => {
  it('accepts all valid speed values', async () => {
    const validSpeeds = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    for (const speed of validSpeeds) {
      const syncPromise = waitForEvent<ScrollSyncedPayload>(receiver, 'scroll_synced', 500);
      controller.emit('scroll_update', { song_id: 'song-1', position: 0, speed });
      const payload = await syncPromise;
      expect(payload.speed).toBe(speed);
    }
  });

  it('rejects invalid speed value with error event', async () => {
    const errorPromise = waitForEvent(controller, 'error', 500);
    controller.emit('scroll_update', { song_id: 'song-1', position: 0, speed: 99 as never });
    await errorPromise;
  });
});
