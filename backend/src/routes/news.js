import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const rawLimit = parseInt(req.query.limit ?? '50', 10);
  const limit    = Math.min(Math.max(rawLimit, 1), 100);

  const { rows } = await pool.query(
    `SELECT
       na.id,
       na.appid,
       na.title,
       na.url,
       na.source_name,
       na.snippet,
       na.published_at,
       na.scraped_at,
       g.name         AS game_name,
       g.header_image
     FROM news_articles na
     JOIN games g ON g.appid = na.appid
     ORDER BY na.scraped_at DESC
     LIMIT $1`,
    [limit],
  );

  res.json({ data: rows, count: rows.length });
}));

export default router;
