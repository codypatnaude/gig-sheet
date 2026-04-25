import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type Database from 'better-sqlite3';

export function createHealthRouter(db: Database.Database): Router {
  const router = createRouter();

  router.get('/health', (_req, res) => {
    try {
      const count = (db.prepare('SELECT COUNT(*) as c FROM songs').get() as { c: number }).c;
      res.json({
        status: 'ok',
        uptime_seconds: Math.floor(process.uptime()),
        song_count: count,
      });
    } catch {
      res.status(500).json({ status: 'error', message: 'Database unavailable' });
    }
  });

  return router;
}
