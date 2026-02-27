import cron from 'node-cron';
import { pollLive } from './pollLive.js';
import { calcDailyPeak } from './calcDailyPeak.js';
import { pruneSnapshots } from './prune.js';
import logger from '../utils/logger.js';

export function registerJobs() {
  // Poll Steam every 60 minutes
  cron.schedule('0 * * * *', async () => {
    await pollLive();
  });

  // Safety-net daily peak aggregation at 23:55 UTC
  cron.schedule('55 23 * * *', async () => {
    await calcDailyPeak();
  }, { timezone: 'UTC' });

  // Prune old snapshots at 01:00 UTC
  cron.schedule('0 1 * * *', async () => {
    await pruneSnapshots();
  }, { timezone: 'UTC' });

  logger.info('[scheduler] jobs registered (poll: hourly, peak: 23:55, prune: 01:00)');
}
