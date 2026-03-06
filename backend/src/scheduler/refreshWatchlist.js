import pool from '../db/pool.js';
import { fetchWishlistedGames, fetchNewReleases } from '../services/steamApi.js';
import logger from '../utils/logger.js';

/**
 * Refreshes the wishlist_tracking table from two Steam sources:
 *   1. Top 100 most-wishlisted upcoming games (pre-launch monitoring)
 *   2. Top 50 popular new releases (launch-day catch before GetMostPlayedGames catches up)
 * Runs daily. Games are inserted once and kept indefinitely — pollLive
 * ignores any that have already made it into leaderboard_cache.
 */
export async function refreshWatchlist() {
  logger.info('[refreshWatchlist] starting');

  const [wishlistGames, newReleases] = await Promise.allSettled([
    fetchWishlistedGames(),
    fetchNewReleases(),
  ]);

  if (wishlistGames.status === 'rejected') {
    logger.error('[refreshWatchlist] fetchWishlistedGames failed:', wishlistGames.reason.message);
  }
  if (newReleases.status === 'rejected') {
    logger.error('[refreshWatchlist] fetchNewReleases failed:', newReleases.reason.message);
  }

  const games = [
    ...(wishlistGames.status === 'fulfilled' ? wishlistGames.value : []),
    ...(newReleases.status === 'fulfilled' ? newReleases.value : []),
  ];

  if (games.length === 0) {
    logger.info('[refreshWatchlist] no games returned from either source');
    return;
  }

  // Deduplicate by appid across both sources
  const seen = new Set();
  const deduped = games.filter(({ appid }) => {
    if (seen.has(appid)) return false;
    seen.add(appid);
    return true;
  });

  const appids = deduped.map((g) => g.appid);
  const names  = deduped.map((g) => g.name);

  await pool.query(
    `INSERT INTO wishlist_tracking (appid, name)
     SELECT unnest($1::integer[]), unnest($2::text[])
     ON CONFLICT (appid) DO NOTHING`,
    [appids, names],
  );

  const wishlistCount  = wishlistGames.status === 'fulfilled' ? wishlistGames.value.length : 0;
  const releasesCount  = newReleases.status  === 'fulfilled' ? newReleases.value.length  : 0;
  logger.info(`[refreshWatchlist] done — ${wishlistCount} upcoming + ${releasesCount} new releases = ${deduped.length} tracked`);
}
