import pool from '../db/pool.js';
import { fetchTopGames, fetchAppDetails } from '../services/steamApi.js';
import { upsertGameMeta } from '../services/gameCache.js';
import logger from '../utils/logger.js';

/**
 * Core poll job — runs every 60 minutes.
 * 1. Fetches top 100 games from Steam.
 * 2. Upserts metadata for any new games (batched Steam API calls).
 * 3. Inserts CCU snapshots.
 * 4. Upserts daily peaks.
 * 5. Rebuilds leaderboard_cache atomically.
 */
export async function pollLive() {
  const start = Date.now();
  logger.info('[pollLive] starting poll');

  let ranks;
  try {
    ranks = await fetchTopGames();
  } catch (err) {
    logger.error('[pollLive] fetchTopGames failed:', err.message);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure all games exist in DB; fetch metadata for new ones.
    for (const { appid, peak_in_game } of ranks) {
      const { rows } = await client.query(
        'SELECT appid FROM games WHERE appid = $1',
        [appid],
      );
      if (rows.length === 0) {
        // New game — fetch details from Steam
        const details = await fetchAppDetails(appid);
        const name = details?.name ?? `App ${appid}`;
        const header_image = details?.header_image ?? null;
        await upsertGameMeta(appid, name, header_image);
      }
    }

    // 2. Insert CCU snapshots
    for (const { appid, peak_in_game } of ranks) {
      await client.query(
        'INSERT INTO ccu_snapshots (appid, ccu) VALUES ($1, $2)',
        [appid, peak_in_game],
      );
    }

    // 3. Upsert daily peaks
    const today = new Date().toISOString().slice(0, 10);
    for (const { appid, peak_in_game } of ranks) {
      await client.query(
        `INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
         VALUES ($1, $2, $3)
         ON CONFLICT (appid, peak_date)
         DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)`,
        [appid, today, peak_in_game],
      );
    }

    // 4. Rebuild leaderboard_cache atomically
    await client.query('DELETE FROM leaderboard_cache');
    for (const { rank, appid, peak_in_game } of ranks) {
      // peak_24h = max ccu in last 24h from ccu_snapshots
      const { rows: peakRows } = await client.query(
        `SELECT GREATEST(MAX(ccu), $1) AS peak_24h
         FROM ccu_snapshots
         WHERE appid = $2
           AND captured_at >= NOW() - INTERVAL '24 hours'`,
        [peak_in_game, appid],
      );
      const peak_24h = peakRows[0].peak_24h;

      await client.query(
        `INSERT INTO leaderboard_cache (rank, appid, current_ccu, peak_24h, last_updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (appid) DO UPDATE
           SET rank = EXCLUDED.rank,
               current_ccu = EXCLUDED.current_ccu,
               peak_24h = EXCLUDED.peak_24h,
               last_updated_at = NOW()`,
        [rank, appid, peak_in_game, peak_24h],
      );
    }

    await client.query('COMMIT');
    logger.info(`[pollLive] done in ${Date.now() - start}ms — ${ranks.length} games`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[pollLive] transaction rolled back:', err.message);
  } finally {
    client.release();
  }
}
