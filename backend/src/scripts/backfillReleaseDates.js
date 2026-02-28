/**
 * One-time script — populates release_date for all games in the DB that
 * currently have release_date IS NULL.
 *
 * Safe to re-run — only processes games with a missing release_date.
 *
 * Run on the server:
 *   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
 *     exec backend node src/scripts/backfillReleaseDates.js
 */

import 'dotenv/config';
import pool from '../db/pool.js';
import { fetchAppDetails } from '../services/steamApi.js';
import logger from '../utils/logger.js';

const DELAY_MS = 300; // ms between Steam API calls

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillReleaseDates() {
  logger.info('[backfillDates] === Starting release date backfill ===');

  const { rows } = await pool.query(
    'SELECT appid, name FROM games WHERE release_date IS NULL ORDER BY appid',
  );

  logger.info(`[backfillDates] ${rows.length} games need release dates`);

  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  for (const { appid, name } of rows) {
    try {
      const details = await fetchAppDetails(appid);
      const release_date = details?.release_date ?? null;

      if (release_date) {
        await pool.query(
          'UPDATE games SET release_date = $1 WHERE appid = $2',
          [release_date, appid],
        );
        logger.info(`[backfillDates] ${name} (${appid}): ${release_date}`);
        updated++;
      } else {
        logger.info(`[backfillDates] ${name} (${appid}): no date available`);
        skipped++;
      }
    } catch (err) {
      logger.error(`[backfillDates] Failed for ${appid}: ${err.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  logger.info(
    `[backfillDates] === Complete — ${updated} updated, ${skipped} skipped, ${failed} failed ===`,
  );
  await pool.end();
}

backfillReleaseDates().catch((err) => {
  logger.error('[backfillDates] Fatal:', err.message);
  process.exit(1);
});
