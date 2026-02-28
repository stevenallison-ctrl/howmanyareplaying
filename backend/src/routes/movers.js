import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      lc.rank,
      lc.appid,
      lc.current_ccu                                                      AS ccu,
      lc.prev_ccu,
      (lc.current_ccu - lc.prev_ccu)                                      AS delta,
      ROUND(((lc.current_ccu - lc.prev_ccu) * 100.0 /
        NULLIF(lc.prev_ccu, 0)), 1)::float                                AS pct_change,
      lc.last_updated_at,
      g.name,
      g.header_image
    FROM leaderboard_cache lc
    JOIN games g ON g.appid = lc.appid
    WHERE lc.prev_ccu IS NOT NULL AND lc.prev_ccu > 0
    ORDER BY pct_change DESC
  `);

  const gainers = rows.filter((r) => r.delta > 0).slice(0, 10);
  const losers  = rows.filter((r) => r.delta < 0).slice(-10).reverse();

  const last_updated_at = rows[0]?.last_updated_at ?? null;

  res.json({ gainers, losers, last_updated_at });
}));

export default router;
