import pool from '../db/pool.js';
import { fetchWishlistedGames } from '../services/steamApi.js';
import logger from '../utils/logger.js';

/**
 * Refreshes the wishlist_tracking table from the Steam wishlist API.
 * Runs daily. Games are inserted once and kept indefinitely — pollLive
 * ignores any that have already made it into leaderboard_cache.
 */
export async function refreshWatchlist() {
  logger.info('[refreshWatchlist] starting');

  let games;
  try {
    games = await fetchWishlistedGames();
  } catch (err) {
    logger.error('[refreshWatchlist] fetchWishlistedGames failed:', err.message);
    return;
  }

  if (games.length === 0) {
    logger.info('[refreshWatchlist] no games returned');
    return;
  }

  const appids = games.map((g) => g.appid);
  const names  = games.map((g) => g.name);

  await pool.query(
    `INSERT INTO wishlist_tracking (appid, name)
     SELECT unnest($1::integer[]), unnest($2::text[])
     ON CONFLICT (appid) DO NOTHING`,
    [appids, names],
  );

  logger.info(`[refreshWatchlist] done — ${games.length} games tracked`);
}
