import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      pr.id,
      pr.window_days,
      pr.ccu,
      pr.record_at,
      g.appid,
      g.name,
      g.header_image
    FROM peak_records pr
    JOIN games g ON g.appid = pr.appid
    ORDER BY pr.record_at DESC
    LIMIT 50
  `);

  res.json({ data: rows, count: rows.length });
}));

export default router;
