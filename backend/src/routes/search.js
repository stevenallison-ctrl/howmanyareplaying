import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const q = (req.query.q ?? '').trim();

  if (q.length === 0) return res.json({ data: [], count: 0 });
  if (q.length > 200) return res.status(400).json({ error: 'Query too long' });

  const { rows } = await pool.query(
    `SELECT appid, name, header_image
     FROM games
     WHERE name ILIKE $1
     ORDER BY name
     LIMIT 20`,
    [`%${q}%`],
  );

  res.json({ data: rows, count: rows.length });
}));

export default router;
