import pool from '../db/pool.js';
import { fetchTopGames, fetchAppDetails } from '../services/steamApi.js';
import { upsertGameMeta } from '../services/gameCache.js';
import logger from '../utils/logger.js';

const STEAMCHARTS_DATA = 'https://steamcharts.com/app';
const DAYS_BACK = 365;

/**
 * Retroactively imports up to 365 days of daily peak history from SteamCharts
 * for a game that just entered the top 100 for the first time.
 * Runs fire-and-forget after the main poll transaction commits.
 */
async function backfillNewGame(appid) {
  logger.info(`[pollLive] retroactive backfill starting for ${appid}`);
  const res = await fetch(`${STEAMCHARTS_DATA}/${appid}/chart-data.json`, {
    headers: { 'User-Agent': 'howmanyareplaying.com' },
  });
  if (!res.ok) throw new Error(`SteamCharts HTTP ${res.status}`);

  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error('unexpected SteamCharts response');

  const today     = new Date().toISOString().slice(0, 10);
  const cutoffMs  = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
  const byDate    = {};

  for (const [tsMs, ccu] of raw) {
    if (tsMs < cutoffMs || !ccu || ccu <= 0) continue;
    const date = new Date(tsMs).toISOString().slice(0, 10);
    if (!byDate[date] || ccu > byDate[date]) byDate[date] = ccu;
  }
  delete byDate[today]; // live poll owns today's row

  for (const [date, peak_ccu] of Object.entries(byDate)) {
    await pool.query(
      `INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
       VALUES ($1, $2, $3)
       ON CONFLICT (appid, peak_date)
       DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)`,
      [appid, date, Math.round(peak_ccu)],
    );
  }

  logger.info(
    `[pollLive] retroactive backfill complete for ${appid} — ` +
    `${Object.keys(byDate).length} days inserted`,
  );
}

/**
 * Core poll job — runs every 60 minutes.
 * 1. Fetches top 100 games from Steam.
 * 2. Upserts metadata for any new games (batched Steam API calls).
 * 3. Inserts CCU snapshots.
 * 4. Upserts daily peaks.
 * 5. Rebuilds leaderboard_cache atomically.
 * 6. Fire-and-forget retroactive history backfill for brand-new games.
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

  const newGameIds = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure all games exist in DB; fetch metadata for new ones.
    for (const { appid } of ranks) {
      const { rows } = await client.query(
        'SELECT appid FROM games WHERE appid = $1',
        [appid],
      );
      if (rows.length === 0) {
        // New game — fetch details from Steam
        const details = await fetchAppDetails(appid);
        const name         = details?.name         ?? `App ${appid}`;
        const header_image = details?.header_image ?? null;
        await upsertGameMeta(appid, name, header_image);
        newGameIds.push(appid); // mark for retroactive backfill
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
    return;
  } finally {
    client.release();
  }

  // 5. Retroactive history backfill for brand-new games (fire and forget)
  for (const appid of newGameIds) {
    backfillNewGame(appid).catch((err) =>
      logger.warn(`[pollLive] retroactive backfill failed for ${appid}: ${err.message}`),
    );
  }
}
