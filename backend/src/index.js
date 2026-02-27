import 'dotenv/config';
import { runMigrations } from './db/migrate.js';
import { warmCache } from './services/gameCache.js';
import { registerJobs } from './scheduler/index.js';
import { pollLive } from './scheduler/pollLive.js';
import { createApp } from './app.js';
import logger from './utils/logger.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  // 1. Run DB migrations
  await runMigrations();

  // 2. Warm in-memory game cache from DB
  await warmCache();

  // 3. Register cron jobs
  registerJobs();

  // 4. Do an immediate poll so data is available on first request
  await pollLive();

  // 5. Start HTTP server
  const app = createApp();
  app.listen(PORT, () => {
    logger.info(`[server] listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
