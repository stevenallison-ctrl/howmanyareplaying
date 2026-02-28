/**
 * Extended poll — runs every 60 minutes at :30 (offset from the live poll).
 *
 * Fetches current CCU for every game in the DB that is NOT currently in
 * the live top-100 leaderboard_cache. This keeps daily_peaks fresh for
 * the extended game set so the 7d/30d/90d/180d/365d views correctly rank
 * games that have dropped out of the real-time top 100.
 *
 * Uses GetNumberOfCurrentPlayers (public, no API key required).
 * Rate-limited to ~500 ms/game to stay well within Steam's limits.
 */

import pool from '../db/pool.js';
import { fetchGameCCU } from '../services/steamApi.js';
import logger from '../utils/logger.js';

const DELAY_MS = 500; // ms between individual game API calls

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollExtended() {
  const start = Date.now();
  logger.info('[pollExtended] starting extended CCU poll');

  // All games in DB that are NOT in the current live top-100
  const { rows: games } = await pool.query(`
    SELECT g.appid, g.name
    FROM games g
    WHERE g.appid NOT IN (SELECT appid FROM leaderboard_cache)
    ORDER BY g.appid
  `);

  if (games.length === 0) {
    logger.info('[pollExtended] no extended games to poll');
    return;
  }

  logger.info(`[pollExtended] polling ${games.length} extended games`);

  const today = new Date().toISOString().slice(0, 10);
  let updated = 0;
  let failed  = 0;

  for (const { appid, name } of games) {
    try {
      const ccu = await fetchGameCCU(appid);
      if (ccu === null) {
        failed++;
        await sleep(DELAY_MS);
        continue;
      }

      // Record the snapshot
      await pool.query(
        'INSERT INTO ccu_snapshots (appid, ccu) VALUES ($1, $2)',
        [appid, ccu],
      );

      // Keep daily peak current
      await pool.query(
        `INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
         VALUES ($1, $2, $3)
         ON CONFLICT (appid, peak_date)
         DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)`,
        [appid, today, ccu],
      );

      updated++;
    } catch (err) {
      logger.warn(`[pollExtended] ${name} (${appid}): ${err.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  logger.info(
    `[pollExtended] done in ${Date.now() - start}ms — ` +
    `${updated} updated, ${failed} failed`,
  );
}
