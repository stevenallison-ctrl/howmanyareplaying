/**
 * One-time backfill script — discovers the top 500 Steam games via
 * SteamCharts and imports up to 365 days of daily peak CCU for each.
 *
 * Steps:
 *  1. Scrape steamcharts.com/top pages 1-5 to collect ~500 app IDs.
 *  2. Upsert game metadata (name + header image) for any new games.
 *  3. Fetch chart-data.json per game and insert into daily_peaks
 *     using GREATEST conflict resolution (never overwrites better data).
 *
 * Going forward, the hourly live poll and extended poll keep data fresh.
 * SteamCharts backfill data ages out of 90d/180d windows naturally as
 * our own collected snapshots accumulate.
 *
 * Run once on the server after deploying:
 *   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
 *     exec backend node src/scripts/backfillHistory.js
 */

import 'dotenv/config';
import pool from '../db/pool.js';
import { fetchAppDetails } from '../services/steamApi.js';
import { upsertGameMeta } from '../services/gameCache.js';
import logger from '../utils/logger.js';

const STEAMCHARTS_TOP  = 'https://steamcharts.com/top';
const STEAMCHARTS_DATA = 'https://steamcharts.com/app';
const DAYS_BACK        = 365;
const PAGE_DELAY_MS    = 2000;   // between top-page fetches
const GAME_DELAY_MS    = 1500;   // between per-game history fetches
const META_DELAY_MS    = 300;    // between Steam metadata fetches
const TOP_PAGES        = 5;      // pages 1-5 ≈ top 500 games

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Step 1: Collect app IDs from SteamCharts top pages ──────────────────────

async function fetchTopAppIds() {
  const appIds = new Set();

  for (let p = 1; p <= TOP_PAGES; p++) {
    const url = p === 1 ? STEAMCHARTS_TOP : `${STEAMCHARTS_TOP}/p${p}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'howmanyareplaying.com/backfill' },
      });
      if (!res.ok) {
        logger.warn(`[backfill] Top page ${p}: HTTP ${res.status} — skipping`);
        continue;
      }
      const html = await res.text();
      // App IDs appear as href="/app/{appid}" throughout the page
      const matches = html.matchAll(/href="\/app\/(\d+)"/g);
      for (const [, id] of matches) {
        appIds.add(parseInt(id, 10));
      }
      logger.info(`[backfill] Page ${p} scraped — ${appIds.size} unique app IDs so far`);
    } catch (err) {
      logger.error(`[backfill] Top page ${p} fetch failed: ${err.message}`);
    }
    await sleep(PAGE_DELAY_MS);
  }

  logger.info(`[backfill] Discovered ${appIds.size} total app IDs`);
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
