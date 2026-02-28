/**
 * One-time backfill script — imports up to 365 days of daily peak CCU
 * from SteamCharts for all known games.
 *
 * Discovery sources (combined, deduplicated):
 *  1. All games already in the DB (captured by the live poll).
 *  2. Steam's GetMostPlayedGames API — current top 100.
 *
 * Steps:
 *  1. Collect app IDs from DB + Steam API.
 *  2. Upsert game metadata (name + header image) for any new games.
 *  3. Fetch chart-data.json per game from SteamCharts and insert into
 *     daily_peaks using GREATEST conflict resolution.
 *
 * Safe to re-run — existing data is never overwritten with lower values.
 *
 * Run on the server:
 *   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
 *     exec backend node src/scripts/backfillHistory.js
 */

import 'dotenv/config';
import pool from '../db/pool.js';
import { fetchAppDetails } from '../services/steamApi.js';
import { upsertGameMeta } from '../services/gameCache.js';
import logger from '../utils/logger.js';

const STEAM_TOP_URL    = 'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/?format=json';
const STEAMCHARTS_DATA = 'https://steamcharts.com/app';
const DAYS_BACK        = 365;
const GAME_DELAY_MS    = 1500;   // between per-game history fetches
const META_DELAY_MS    = 300;    // between Steam metadata fetches

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Step 1: Collect app IDs from DB + Steam API ─────────────────────────────

async function fetchTopAppIds() {
  const appIds = new Set();

  // Source A: all games already tracked in the DB
  try {
    const { rows } = await pool.query('SELECT appid FROM games');
    for (const { appid } of rows) appIds.add(appid);
    logger.info(`[backfill] ${rows.length} app IDs from DB`);
  } catch (err) {
    logger.error(`[backfill] DB query failed: ${err.message}`);
  }

  // Source B: Steam's current top 100
  try {
    const url = process.env.STEAM_API_KEY
      ? `${STEAM_TOP_URL}&key=${process.env.STEAM_API_KEY}`
      : STEAM_TOP_URL;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const ranks = json?.response?.ranks ?? [];
      for (const { appid } of ranks) appIds.add(appid);
      logger.info(`[backfill] ${ranks.length} app IDs from Steam API`);
    } else {
      logger.warn(`[backfill] Steam API returned ${res.status}`);
    }
  } catch (err) {
    logger.warn(`[backfill] Steam API fetch failed: ${err.message}`);
  }

  logger.info(`[backfill] ${appIds.size} unique app IDs to process`);
  return [...appIds];
}

// ─── Step 2: Ensure game metadata exists for each app ID ─────────────────────

async function ensureGames(appIds) {
  const { rows: existing } = await pool.query('SELECT appid FROM games');
  const knownIds = new Set(existing.map((r) => r.appid));

  const newIds = appIds.filter((id) => !knownIds.has(id));
  logger.info(`[backfill] ${newIds.length} new games need metadata`);

  for (const appid of newIds) {
    try {
      const details = await fetchAppDetails(appid);
      const name         = details?.name         ?? `App ${appid}`;
      const header_image = details?.header_image ?? null;
      await upsertGameMeta(appid, name, header_image);
    } catch (err) {
      logger.warn(`[backfill] Metadata fetch failed for ${appid}: ${err.message}`);
    }
    await sleep(META_DELAY_MS);
  }
}

// ─── Step 3: Fetch and insert historical CCU data per game ───────────────────

async function fetchChartData(appid) {
  const res = await fetch(`${STEAMCHARTS_DATA}/${appid}/chart-data.json`, {
    headers: { 'User-Agent': 'howmanyareplaying.com/backfill' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Collapses raw [[timestamp_ms, ccu], ...] entries into a
 * { 'YYYY-MM-DD': peak_ccu } map for the last DAYS_BACK days.
 * Takes the max value per calendar day so hourly data becomes a daily peak.
 */
function toDailyPeaks(entries) {
  const cutoffMs = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
  const byDate   = {};

  for (const [tsMs, ccu] of entries) {
    if (tsMs < cutoffMs || !ccu || ccu <= 0) continue;
    const date = new Date(tsMs).toISOString().slice(0, 10);
    if (!byDate[date] || ccu > byDate[date]) byDate[date] = ccu;
  }

  return byDate;
}

async function backfillGame(appid, today) {
  const raw = await fetchChartData(appid);
  if (!Array.isArray(raw) || raw.length === 0) return 0;

  const byDate = toDailyPeaks(raw);
  delete byDate[today]; // live poll owns today's row

  const entries = Object.entries(byDate);
  if (entries.length === 0) return 0;

  // Batch all rows for this game into a single query using UNNEST —
  // avoids ~365 round-trips per game over a cloud DB connection.
  const dates  = entries.map(([date]) => date);
  const ccus   = entries.map(([, ccu]) => Math.round(ccu));

  await pool.query(
    `INSERT INTO daily_peaks (appid, peak_date, peak_ccu)
     SELECT $1, unnest($2::date[]), unnest($3::integer[])
     ON CONFLICT (appid, peak_date)
     DO UPDATE SET peak_ccu = GREATEST(daily_peaks.peak_ccu, EXCLUDED.peak_ccu)`,
    [appid, dates, ccus],
  );

  return entries.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function backfill() {
  logger.info('[backfill] === Starting full backfill ===');

  // Step 1 — discover app IDs
  const appIds = await fetchTopAppIds();
  if (appIds.length === 0) {
    logger.error('[backfill] No app IDs found — aborting');
    process.exit(1);
  }

  // Step 2 — ensure all games have metadata in DB
  await ensureGames(appIds);

  // Step 3 — fetch and insert historical data
  const today      = new Date().toISOString().slice(0, 10);
  let succeeded    = 0;
  let failed       = 0;
  let totalRows    = 0;

  for (const appid of appIds) {
    try {
      // Look up name for logging
      const { rows } = await pool.query(
        'SELECT name FROM games WHERE appid = $1', [appid],
      );
      const name = rows[0]?.name ?? `App ${appid}`;

      logger.info(`[backfill] Fetching history for ${name} (${appid})`);
      const rowCount = await backfillGame(appid, today);

      if (rowCount > 0) {
        logger.info(`[backfill] Upserted ${rowCount} days for ${name}`);
        totalRows += rowCount;
      } else {
        logger.info(`[backfill] No usable data for ${appid}`);
      }
      succeeded++;
    } catch (err) {
      logger.error(`[backfill] Failed for ${appid}: ${err.message}`);
      failed++;
    }
    await sleep(GAME_DELAY_MS);
  }

  logger.info(
    `[backfill] === Complete — ${succeeded} games OK, ${failed} failed, ` +
    `${totalRows} daily_peak rows upserted ===`,
  );
  await pool.end();
}

backfill().catch((err) => {
  logger.error('[backfill] Fatal:', err.message);
  process.exit(1);
});
