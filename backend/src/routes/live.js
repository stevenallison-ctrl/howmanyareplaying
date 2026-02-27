import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      lc.rank,
      lc.appid,
      lc.current_ccu AS ccu,
      lc.peak_24h,
      lc.last_updated_at,
      g.name,
      g.header_image
    FROM leaderboard_cache lc
    JOIN games g ON g.appid = lc.appid
    ORDER BY lc.rank ASC
  `);
  res.json({ data: rows, count: rows.length });
}));

export default router;
