import { Router } from 'express';
import { fetchWishlistedGames } from '../services/steamApi.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

const router = Router();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cache    = null; // { data: Array, fetchedAt: number } | null
let inflight = null; // Promise | null — prevents thundering herd

async function getWishlistData() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  if (inflight) return inflight;

  inflight = fetchWishlistedGames()
    .then((data) => {
      cache    = { data, fetchedAt: Date.now() };
      inflight = null;
      logger.info(`[wishlist] cache refreshed — ${data.length} games`);
      return data;
    })
    .catch((err) => {
      inflight = null;
      logger.error('[wishlist] fetch failed:', err.message);
      if (cache) {
        logger.warn('[wishlist] serving stale cache after fetch failure');
        return cache.data;
      }
      throw err;
    });

  return inflight;
}

router.get('/', asyncHandler(async (_req, res) => {
  const data = await getWishlistData();
  res.json({ data, count: data.length });
}));

export default router;
