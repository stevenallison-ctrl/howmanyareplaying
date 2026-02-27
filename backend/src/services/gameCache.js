import pool from '../db/pool.js';
import { fetchAppDetails } from './steamApi.js';
import logger from '../utils/logger.js';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @type {Map<number, {name: string, header_image: string|null, fetchedAt: number}>} */
const cache = new Map();

/**
 * Returns game metadata for appid, using the in-memory cache first,
 * then DB, then Steam API as fallback.
 */
export async function getGameMeta(appid) {
  const cached = cache.get(appid);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { name: cached.name, header_image: cached.header_image };
  }

  // Try DB
  const { rows } = await pool.query(
    'SELECT name, header_image FROM games WHERE appid = $1',
    [appid],
  );
  if (rows.length > 0) {
    cache.set(appid, { ...rows[0], fetchedAt: Date.now() });
    return rows[0];
  }

  // Fall back to Steam API
  const details = await fetchAppDetails(appid);
  if (details) {
    cache.set(appid, { ...details, fetchedAt: Date.now() });
  }
  return details;
}

/**
 * Upserts game metadata into DB and refreshes in-memory cache.
 * Called during the poll job after verifying the name.
 */
export async function upsertGameMeta(appid, name, header_image) {
  await pool.query(
    `INSERT INTO games (appid, name, header_image, last_fetched_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (appid) DO UPDATE
       SET name = EXCLUDED.name,
           header_image = COALESCE(EXCLUDED.header_image, games.header_image),
           last_fetched_at = NOW()`,
    [appid, name, header_image],
  );
  cache.set(appid, { name, header_image, fetchedAt: Date.now() });
}

/**
 * Pre-warm cache from the DB on startup.
 */
export async function warmCache() {
  try {
    const { rows } = await pool.query('SELECT appid, name, header_image FROM games');
    for (const row of rows) {
      cache.set(row.appid, { name: row.name, header_image: row.header_image, fetchedAt: Date.now() });
    }
    logger.info(`[gameCache] warmed with ${rows.length} games`);
  } catch (err) {
    logger.warn('[gameCache] warm failed (DB may not be ready yet):', err.message);
  }
}
