import 'dotenv/config';
import { runMigrations } from './db/migrate.js';
import { warmCache } from './services/gameCache.js';
import { registerJobs } from './scheduler/index.js';
import { pollLive } from './scheduler/pollLive.js';
import { pollNews } from './scheduler/pollNews.js';
import { refreshWatchlist } from './scheduler/refreshWatchlist.js';
import { createApp } from './app.js';
import logger from './utils/logger.js';
import pool from './db/pool.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  // 1. Run DB migrations
  await runMigrations();

  // 2. Warm in-memory game cache from DB
  await warmCache();

  // 3. Register cron jobs
  registerJobs();

  // 4. On first deploy, seed wishlist tracking immediately so the next
  //    pollLive has games to watch. Must complete before pollLive runs.
  const { rows: wlRows } = await pool.query('SELECT 1 FROM wishlist_tracking LIMIT 1');
  if (wlRows.length === 0) {
    await refreshWatchlist().catch((err) =>
      logger.warn('[refreshWatchlist] initial seed failed:', err.message),
    );
  }

  // 5. Do an immediate poll so data is available on first request
  await pollLive();

  // 6. On first deploy, run news scrape immediately (table will be empty)
  const { rows } = await pool.query('SELECT 1 FROM news_articles LIMIT 1');
  if (rows.length === 0) {
    pollNews().catch((err) =>
      logger.warn('[pollNews] initial scrape failed:', err.message),
    );
  }

  // 7. Start HTTP server
  const app = createApp();
  app.listen(PORT, () => {
    logger.info(`[server] listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
