import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/leaderboard?view=live|today|7d|30d|90d|180d|365d
 *
 * live   — current CCU snapshot from leaderboard_cache (real-time)
 * today  — peak CCU today, ranked descending
 * Nd     — avg daily-peak CCU over exactly the last N calendar days,
 *          ranked descending. Includes EVERY game that appeared in the
 *          top 100 during any poll in that window, not just today's top 100.
 *          As data accumulates across days, games will rank differently
 *          from the live/today views based on their historical averages.
 */
router.get('/', asyncHandler(async (req, res) => {
  const view = req.query.view ?? 'live';

  const VALID_VIEWS = ['live', 'today', '7d', '30d', '90d', '180d', '365d'];
  if (!VALID_VIEWS.includes(view)) {
    return res.status(400).json({ error: `view must be one of: ${VALID_VIEWS.join(', ')}` });
  }

  if (view === 'live') {
    const { rows } = await pool.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY lc.current_ccu DESC) AS rank,
        lc.appid,
        lc.current_ccu      AS ccu,
        lc.peak_24h,
        lc.prev_ccu,
        lc.last_updated_at,
        g.name,
        g.header_image
      FROM leaderboard_cache lc
      JOIN games g ON g.appid = lc.appid
      ORDER BY lc.current_ccu DESC
      LIMIT 100
    `);
    return res.json({ view, data: rows, count: rows.length, data_days: 1 });
  }

  if (view === 'today') {
    const { rows } = await pool.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY MAX(dp.peak_ccu) DESC) AS rank,
        dp.appid,
        MAX(dp.peak_ccu)  AS ccu,
        g.name,
        g.header_image
      FROM daily_peaks dp
      JOIN games g ON g.appid = dp.appid
      WHERE dp.peak_date = CURRENT_DATE
      GROUP BY dp.appid, g.name, g.header_image
      ORDER BY ccu DESC
      LIMIT 100
    `);
    return res.json({ view, data: rows, count: rows.length, data_days: 1 });
  }

  // Historical average views: 7d / 30d / 90d / 180d / 365d
  // Use > (not >=) so "7d" means exactly the last 7 calendar days.
  //
  // Rank by AVG(peak_ccu) over days that have data.
  // Games released after the start of the window are excluded entirely —
  // a game must have been out for at least <days> days to appear here.
  // This prevents launch-spike titles from distorting historical averages.
  const days = parseInt(view, 10);
  const { rows } = await pool.query(`
    SELECT
      ROW_NUMBER() OVER (ORDER BY ROUND(AVG(dp.peak_ccu)) DESC) AS rank,
      dp.appid,
      ROUND(AVG(dp.peak_ccu))::integer                          AS ccu,
      COUNT(DISTINCT dp.peak_date)                              AS data_days,
      MIN(dp.peak_date)                                         AS earliest_date,
      g.name,
      g.header_image
    FROM daily_peaks dp
    JOIN games g ON g.appid = dp.appid
    WHERE dp.peak_date > CURRENT_DATE - INTERVAL '${days} days'
      AND (g.release_date IS NULL OR g.release_date <= CURRENT_DATE - INTERVAL '${days} days')
    GROUP BY dp.appid, g.name, g.header_image
    ORDER BY ccu DESC
    LIMIT 100
  `);

  // Overall data coverage for this period (max days any single game has)
  const dataDays = rows.length > 0 ? Math.max(...rows.map(r => Number(r.data_days))) : 0;

  res.json({ view, data: rows, count: rows.length, data_days: dataDays, period_days: days });
}));

export default router;
