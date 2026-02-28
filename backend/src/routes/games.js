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
            lc.current_ccu, lc.peak_24h
     FROM games g
     LEFT JOIN leaderboard_cache lc ON lc.appid = g.appid
     WHERE g.appid = $1`,
    [appid],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json(rows[0]);
}));

export default router;
