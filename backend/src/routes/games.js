import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/:appid', asyncHandler(async (req, res) => {
  const appid = parseInt(req.params.appid, 10);
  if (isNaN(appid)) {
    return res.status(400).json({ error: 'Invalid appid' });
  }

  const { rows } = await pool.query(
    `SELECT g.appid, g.name, g.header_image, g.last_fetched_at,
            lc.current_ccu, lc.peak_24h, lc.rank,
            (SELECT ROUND(AVG(peak_ccu))::integer
             FROM daily_peaks
             WHERE appid = g.appid
               AND peak_date >= DATE_TRUNC('month', CURRENT_DATE)) AS this_month_avg,
            (SELECT ROUND(AVG(peak_ccu))::integer
             FROM daily_peaks
             WHERE appid = g.appid
               AND peak_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
               AND peak_date <  DATE_TRUNC('month', CURRENT_DATE)) AS last_month_avg
     FROM games g
     LEFT JOIN leaderboard_cache lc ON lc.appid = g.appid
     WHERE g.appid = $1`,
    [appid],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const row = rows[0];
  const momPct = (row.last_month_avg && row.this_month_avg)
    ? Math.round(((row.this_month_avg - row.last_month_avg) / row.last_month_avg) * 100)
    : null;

  res.json({ ...row, mom_pct: momPct });
}));

export default router;
