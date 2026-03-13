import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const BASE = 'https://howmanyareplaying.com';

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query('SELECT appid, last_fetched_at FROM games ORDER BY appid');

  const today = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { loc: BASE,               changefreq: 'hourly',  priority: '1.0', lastmod: today },
    { loc: `${BASE}/wishlist`, changefreq: 'daily',   priority: '0.7', lastmod: today },
    { loc: `${BASE}/news`,     changefreq: 'daily',   priority: '0.6', lastmod: today },
    { loc: `${BASE}/compare`,  changefreq: 'monthly', priority: '0.5', lastmod: today },
  ];

  const gamePages = rows.map((r) => ({
    loc: `${BASE}/game/${r.appid}`,
    changefreq: 'hourly',
    priority: '0.8',
    lastmod: r.last_fetched_at ? new Date(r.last_fetched_at).toISOString().slice(0, 10) : today,
  }));

  const allPages = [...staticPages, ...gamePages];

  const urlTags = allPages.map(
    ({ loc, changefreq, priority, lastmod }) =>
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlTags.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(xml);
}));

export default router;
