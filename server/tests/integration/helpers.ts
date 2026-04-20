// Integration test helpers — spin up a real in-process Socket.IO server
// Pattern from research.md Decision 6

import { createServer } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type Database from 'better-sqlite3';
import { initDb } from '../../src/db/schema.js';
import { createSocketServer } from '../../src/socket/index.js';
import { createHealthRouter } from '../../src/routes/health.js';
import { removeMember, setCurrentSong, clearScrollState, getState } from '../../src/socket/state.js';
import type { StateSyncPayload, Role } from '@gig-sheets/shared';

export interface TestServer {
  io: SocketIOServer;
  port: number;
  db: Database.Database;
  close: () => Promise<void>;
}

export async function createTestServer(): Promise<TestServer> {
  // Reset in-memory state before each test server
  const state = getState();
  for (const m of [...state.members]) {
    removeMember(m.socket_id);
  }
  setCurrentSong(null);
  clearScrollState();

  const db = initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use(createHealthRouter(db));

  const httpServer = createServer(app);
  const io = createSocketServer(httpServer, db);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;

  return {
    io,
    port,
    db,
    close: () =>
      new Promise<void>((resolve) => {
        // io.close() closes the engine which also closes the underlying httpServer
        io.close(() => resolve());
      }),
  };
}

export function createClient(port: number): ClientSocket {
  return ioc(`http://localhost:${port}`, {
    autoConnect: true,
    reconnection: false, // test clients don't auto-reconnect by default
  });
}

/** Wait for socket to emit the 'connect' event (socket.id is set after this) */
export function waitForConnect(socket: ClientSocket): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', (err) => reject(new Error(`connect_error: ${String(err)}`)));
  });
}

/** Connect a client, emit member_join, and wait for state_sync — returns connected client + state */
export async function connectAndJoin(
  port: number,
  name: string,
  role: Role
): Promise<{ client: ClientSocket; stateSync: StateSyncPayload }> {
  const client = createClient(port);
  await waitForConnect(client);
  // Set up state_sync listener BEFORE emitting member_join
  const stateSyncPromise = waitForEvent<StateSyncPayload>(client, 'state_sync', 2000);
  client.emit('member_join', { name, role });
  const stateSync = await stateSyncPromise;
  return { client, stateSync };
}

export function waitForEvent<T>(socket: ClientSocket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for event: ${event}`)),
      timeoutMs
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export function disconnectAll(...clients: ClientSocket[]): void {
  for (const c of clients) {
    if (c.connected) c.disconnect();
  }
}
