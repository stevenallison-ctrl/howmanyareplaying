import pool from '../db/pool.js';
import logger from '../utils/logger.js';

/**
 * Safety-net job — runs at 23:55 UTC.
 * Ensures daily_peaks reflects the true max CCU for today
 * by aggregating directly from ccu_snapshots.
 */
export async function calcDailyPeak() {
  logger.info('[calcDailyPeak] running safety-net aggregation');
  try {
    await pool.query(`
      INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
      SELECT appid, DATE(captured_at AT TIME ZONE 'UTC'), MAX(ccu)
      FROM ccu_snapshots
      WHERE captured_at >= CURRENT_DATE AT TIME ZONE 'UTC'
        AND captured_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC'
      GROUP BY appid, DATE(captured_at AT TIME ZONE 'UTC')
      ON CONFLICT (appid, peak_date)
      DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)
    `);
    logger.info('[calcDailyPeak] done');
  } catch (err) {
    logger.error('[calcDailyPeak] failed:', err.message);
  }
}
