/**
 * One-time backfill script — imports historical daily peak CCU from SteamCharts.
 *
 * Data source: https://steamcharts.com/app/{appid}/chart-data.json
 *   - Returns [[timestamp_ms, avg_ccu], ...] pairs
 *   - Recent data (~12 months) is hourly → we take max per day as daily peak
 *   - Older data is monthly averages → one entry per month used as-is
 *
 * Inserts into daily_peaks using GREATEST conflict resolution so it never
 * overwrites better data already collected by the live poll.
 *
 * Run once on the server:
 *   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
 *     exec backend node src/scripts/backfillHistory.js
 */

import 'dotenv/config';
import pool from '../db/pool.js';
import logger from '../utils/logger.js';

const STEAMCHARTS_URL = 'https://steamcharts.com/app';
const DAYS_BACK = 365;
const DELAY_MS = 1500; // 1.5s between requests — be respectful

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChartData(appid) {
  const url = `${STEAMCHARTS_URL}/${appid}/chart-data.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'howmanyareplaying.com data collector' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Collapse raw [[timestamp_ms, ccu], ...] entries into a
 * { 'YYYY-MM-DD': peak_ccu } map covering the last DAYS_BACK days.
 * Takes the maximum ccu value seen on each calendar day.
 */
function toDailyPeaks(entries) {
  const cutoffMs = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
  const byDate = {};

  for (const [tsMs, ccu] of entries) {
    if (tsMs < cutoffMs) continue;
    if (!ccu || ccu <= 0) continue;

    const date = new Date(tsMs).toISOString().slice(0, 10);
    if (!byDate[date] || ccu > byDate[date]) {
      byDate[date] = ccu;
    }
  }

  return byDate;
}

async function backfill() {
  const { rows: games } = await pool.query(
    'SELECT appid, name FROM games ORDER BY appid',
  );

  if (games.length === 0) {
    logger.info('[backfill] No games in DB yet — run after the first poll completes.');
    process.exit(0);
  }

  logger.info(`[backfill] Starting backfill for ${games.length} games (${DAYS_BACK} days)`);

  const today = new Date().toISOString().slice(0, 10);
  let succeeded = 0;
  let failed = 0;
  let totalRows = 0;

  for (const { appid, name } of games) {
    try {
      logger.info(`[backfill] Fetching ${name} (${appid})`);
      const raw = await fetchChartData(appid);

      if (!Array.isArray(raw) || raw.length === 0) {
        logger.warn(`[backfill] Empty response for ${appid}`);
        failed++;
        await sleep(DELAY_MS);
        continue;
      }

      const byDate = toDailyPeaks(raw);
      // Never touch today — the live poll owns that row
      delete byDate[today];

      const dates = Object.keys(byDate);
      if (dates.length === 0) {
        logger.info(`[backfill] No usable data for ${appid}`);
      } else {
        for (const [date, peak_ccu] of Object.entries(byDate)) {
          await pool.query(
            `INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
             VALUES ($1, $2, $3)
             ON CONFLICT (appid, peak_date)
             DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)`,
            [appid, date, Math.round(peak_ccu)],
          );
        }
        logger.info(`[backfill] Inserted/updated ${dates.length} days for ${name}`);
        totalRows += dates.length;
      }

      succeeded++;
    } catch (err) {
      logger.error(`[backfill] Failed for ${appid} (${name}): ${err.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  logger.info(
    `[backfill] Complete — ${succeeded} games OK, ${failed} failed, ${totalRows} daily_peak rows upserted`,
  );
  await pool.end();
}

backfill().catch((err) => {
  logger.error('[backfill] Fatal:', err.message);
  process.exit(1);
});
