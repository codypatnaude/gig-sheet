import type { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type Database from 'better-sqlite3';
import { registerMemberHandlers } from './handlers/member.js';
import { registerSetlistHandlers } from './handlers/setlist.js';
import { registerSelectionHandlers } from './handlers/selection.js';
import { registerScrollHandlers } from './handlers/scroll.js';

export function createSocketServer(httpServer: HTTPServer, db: Database.Database): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    registerMemberHandlers(io, socket, db);
    registerSetlistHandlers(io, socket, db);
    registerSelectionHandlers(io, socket);
    registerScrollHandlers(io, socket);
  });

  return io;
}
