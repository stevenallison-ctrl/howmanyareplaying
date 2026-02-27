import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/leaderboard?view=live|today|7d|30d|90d|180d|365d
 *
 * Returns up to 100 games ranked by the requested metric:
 *   live   → current CCU from leaderboard_cache
 *   today  → peak CCU today from daily_peaks
 *   7d     → average peak CCU over the last 7 days
 *   30d    → average peak CCU over the last 30 days
 *   90d    → average peak CCU over the last 90 days
 *   180d   → average peak CCU over the last 180 days
 *   365d   → average peak CCU over the last 365 days
 */
router.get('/', asyncHandler(async (req, res) => {
  const view = req.query.view ?? 'live';

  const VALID_VIEWS = ['live', 'today', '7d', '30d', '90d', '180d', '365d'];
  if (!VALID_VIEWS.includes(view)) {
    return res.status(400).json({ error: `view must be one of: ${VALID_VIEWS.join(', ')}` });
  }

  let rows;

  if (view === 'live') {
    ({ rows } = await pool.query(`
      SELECT
        lc.rank,
        lc.appid,
        lc.current_ccu      AS ccu,
        lc.peak_24h,
        lc.last_updated_at,
        g.name,
        g.header_image
      FROM leaderboard_cache lc
      JOIN games g ON g.appid = lc.appid
      ORDER BY lc.rank ASC
      LIMIT 100
    `));
  } else {
    const days = view === 'today' ? 1 : parseInt(view, 10);
    const interval = view === 'today'
      ? `AND peak_date = CURRENT_DATE`
      : `AND peak_date >= CURRENT_DATE - INTERVAL '${days} days'`;

    const metric = view === 'today' ? 'MAX(dp.peak_ccu)' : 'ROUND(AVG(dp.peak_ccu))';

    ({ rows } = await pool.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY ${metric} DESC) AS rank,
        dp.appid,
        ${metric}                                    AS ccu,
        g.name,
        g.header_image
      FROM daily_peaks dp
      JOIN games g ON g.appid = dp.appid
      WHERE 1=1 ${interval}
      GROUP BY dp.appid, g.name, g.header_image
      ORDER BY ccu DESC
      LIMIT 100
    `));
  }

  res.json({ view, data: rows, count: rows.length });
}));

export default router;
