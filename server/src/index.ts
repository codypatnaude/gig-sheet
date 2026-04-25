import { createServer } from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/schema.js';
import { seedIfEmpty } from './db/seed.js';
import { createSocketServer } from './socket/index.js';
import { createHealthRouter } from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../gigsheet.db');

const db = initDb(DB_PATH);
seedIfEmpty(db);

const app = express();
app.use(express.json());
app.use(createHealthRouter(db));

// Serve client build
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const httpServer = createServer(app);
createSocketServer(httpServer, db);

httpServer.listen(PORT, () => {
  console.log(`GigSheet server running at http://localhost:${PORT}`);
});

export { app, httpServer };
