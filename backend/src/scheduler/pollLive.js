import pool from '../db/pool.js';
import { fetchTopGames, fetchAppDetails, fetchCurrentPlayers } from '../services/steamApi.js';
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

  const entries = Object.entries(byDate);
  if (entries.length > 0) {
    const dates = entries.map(([date]) => date);
    const ccus  = entries.map(([, ccu]) => Math.round(ccu));
    await pool.query(
      `INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
       SELECT $1, unnest($2::date[]), unnest($3::integer[])
       ON CONFLICT (appid, peak_date)
       DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)`,
      [appid, dates, ccus],
    );
  }

  logger.info(
    `[pollLive] retroactive backfill complete for ${appid} — ` +
    `${entries.length} days inserted`,
  );
}

/**
 * Checks whether any game in leaderboard_cache just broke its 7/30/90-day
 * player count record and inserts a peak_records row if so.
 * Runs fire-and-forget after the main transaction commits.
 */
async function checkPeakRecords() {
  const WINDOWS = [7, 30, 90];

  // Find all games whose current CCU exceeds any N-day window max (excl. today)
  const { rows } = await pool.query(`
    SELECT
      lc.appid,
      lc.current_ccu,
      MAX(CASE WHEN dp.peak_date > CURRENT_DATE - 7  AND dp.peak_date < CURRENT_DATE THEN dp.peak_ccu END) AS max_7d,
      MAX(CASE WHEN dp.peak_date > CURRENT_DATE - 30 AND dp.peak_date < CURRENT_DATE THEN dp.peak_ccu END) AS max_30d,
      MAX(CASE WHEN dp.peak_date > CURRENT_DATE - 90 AND dp.peak_date < CURRENT_DATE THEN dp.peak_ccu END) AS max_90d
    FROM leaderboard_cache lc
    JOIN daily_peaks dp ON dp.appid = lc.appid
    GROUP BY lc.appid, lc.current_ccu
    HAVING
      lc.current_ccu > COALESCE(MAX(CASE WHEN dp.peak_date > CURRENT_DATE - 7  AND dp.peak_date < CURRENT_DATE THEN dp.peak_ccu END), 0)
      OR lc.current_ccu > COALESCE(MAX(CASE WHEN dp.peak_date > CURRENT_DATE - 30 AND dp.peak_date < CURRENT_DATE THEN dp.peak_ccu END), 0)
      OR lc.current_ccu > COALESCE(MAX(CASE WHEN dp.peak_date > CURRENT_DATE - 90 AND dp.peak_date < CURRENT_DATE THEN dp.peak_ccu END), 0)
  `);

  if (rows.length === 0) return;

  const windowKeys = { 7: 'max_7d', 30: 'max_30d', 90: 'max_90d' };
  let inserted = 0;

  for (const row of rows) {
    for (const days of WINDOWS) {
      const prevMax = row[windowKeys[days]];
      if (row.current_ccu <= (prevMax ?? 0)) continue;

      // Only one record per appid+window per UTC day
      const { rowCount } = await pool.query(
        `INSERT INTO peak_records (appid, window_days, ccu)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM peak_records
           WHERE appid = $1 AND window_days = $2 AND record_at::date = CURRENT_DATE
         )`,
        [row.appid, days, row.current_ccu],
      );
      inserted += rowCount;
    }
  }

  if (inserted > 0) {
    logger.info(`[pollLive] ${inserted} new peak record(s) logged`);
  }
}

/**
 * Core poll job — runs every 60 minutes.
 * 1. Fetches top 100 games from Steam (rank order).
 * 2. Upserts metadata for any new games.
 * 3. Fetches actual concurrent player counts from GetNumberOfCurrentPlayers.
 * 4. Inserts CCU snapshots (real-time counts).
 * 5. Upserts daily peaks (real-time counts, GREATEST wins).
 * 6. Rebuilds leaderboard_cache atomically with real-time counts.
 * 7. Fire-and-forget retroactive history backfill for brand-new games.
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

  // 1. Ensure all games exist in DB; fetch metadata for new ones.
  // Done outside the transaction so HTTP calls don't hold a connection open.
  const newGameIds = [];
  for (const { appid } of ranks) {
    const { rows } = await pool.query(
      'SELECT appid FROM games WHERE appid = $1',
      [appid],
    );
    if (rows.length === 0) {
      const details      = await fetchAppDetails(appid);
      const name         = details?.name         ?? `App ${appid}`;
      const header_image = details?.header_image ?? null;
      const release_date = details?.release_date ?? null;
      await upsertGameMeta(appid, name, header_image, release_date);
      newGameIds.push(appid);
    }
  }

  // 2. Fetch real-time concurrent player counts for all ranked games.
  // GetMostPlayedGames returns peak_in_game which is a weekly peak, not the
  // current count. We use GetNumberOfCurrentPlayers for accurate live data.
  const appids = ranks.map((r) => r.appid);
  const currentPlayerMap = await fetchCurrentPlayers(appids);
  logger.info(`[pollLive] fetched real-time counts for ${currentPlayerMap.size}/${appids.length} games`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 3. Insert CCU snapshots (real-time counts)
    for (const { appid, peak_in_game } of ranks) {
      const ccu = currentPlayerMap.get(appid) ?? peak_in_game;
      await client.query(
        'INSERT INTO ccu_snapshots (appid, ccu) VALUES ($1, $2)',
        [appid, ccu],
      );
    }

    // 4. Upsert daily peaks (real-time counts, GREATEST wins across polls)
    const today = new Date().toISOString().slice(0, 10);
    for (const { appid, peak_in_game } of ranks) {
      const ccu = currentPlayerMap.get(appid) ?? peak_in_game;
      await client.query(
        `INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
         VALUES ($1, $2, $3)
         ON CONFLICT (appid, peak_date)
         DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)`,
        [appid, today, ccu],
      );
    }

    // 5. Rebuild leaderboard_cache atomically.
    // Snapshot current CCU values before wiping, so we can compute trend delta.
    const { rows: prevRows } = await client.query(
      'SELECT appid, current_ccu FROM leaderboard_cache',
    );
    const prevCcuMap = new Map(prevRows.map((r) => [r.appid, r.current_ccu]));

    await client.query('DELETE FROM leaderboard_cache');
    for (const { rank, appid, peak_in_game } of ranks) {
      const currentCcu = currentPlayerMap.get(appid) ?? peak_in_game;
      const { rows: peakRows } = await client.query(
        `SELECT GREATEST(MAX(ccu), $1) AS peak_24h
         FROM ccu_snapshots
         WHERE appid = $2
           AND captured_at >= NOW() - INTERVAL '24 hours'`,
        [currentCcu, appid],
      );
      const peak_24h = peakRows[0].peak_24h;
      const prev_ccu = prevCcuMap.get(appid) ?? null;

      await client.query(
        `INSERT INTO leaderboard_cache (rank, appid, current_ccu, peak_24h, prev_ccu, last_updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (appid) DO UPDATE
           SET rank            = EXCLUDED.rank,
               current_ccu     = EXCLUDED.current_ccu,
               peak_24h        = EXCLUDED.peak_24h,
               prev_ccu        = EXCLUDED.prev_ccu,
               last_updated_at = NOW()`,
        [rank, appid, currentCcu, peak_24h, prev_ccu],
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

  // 6. Check for new N-day peak records (fire and forget)
  checkPeakRecords().catch((err) =>
    logger.warn('[pollLive] peak records check failed:', err.message),
  );

  // 7. Retroactive history backfill for brand-new games (fire and forget)
  for (const appid of newGameIds) {
    backfillNewGame(appid).catch((err) =>
      logger.warn(`[pollLive] retroactive backfill failed for ${appid}: ${err.message}`),
    );
  }
}
