import cron from 'node-cron';
import { pollLive } from './pollLive.js';
import { pollExtended } from './pollExtended.js';
import { calcDailyPeak } from './calcDailyPeak.js';
import { pruneSnapshots } from './prune.js';
import { pollNews } from './pollNews.js';
import logger from '../utils/logger.js';

export function registerJobs() {
  // Poll Steam top 100 every 60 minutes at :00
  cron.schedule('0 * * * *', async () => {
    await pollLive();
  });

  // Poll extended game list (all DB games outside top 100) at :30
  // Offset from live poll so they don't compete for DB connections
  cron.schedule('30 * * * *', async () => {
    await pollExtended();
  });

  // Safety-net daily peak aggregation at 23:55 UTC
  cron.schedule('55 23 * * *', async () => {
    await calcDailyPeak();
  }, { timezone: 'UTC' });

  // Prune old snapshots at 01:00 UTC
  cron.schedule('0 1 * * *', async () => {
    await pruneSnapshots();
  }, { timezone: 'UTC' });

  // Scrape gaming news RSS feeds daily at 09:00 America/New_York
  cron.schedule('0 9 * * *', async () => {
    await pollNews().catch((err) =>
      logger.error('[pollNews] cron failed:', err.message),
    );
  }, { timezone: 'America/New_York' });

  logger.info('[scheduler] jobs registered (live: :00, extended: :30, peak: 23:55, prune: 01:00, news: 09:00 EST)');
}
