import { Router } from 'express';
import pool from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/:appid', asyncHandler(async (req, res) => {
  const appid = parseInt(req.params.appid, 10);
  if (isNaN(appid)) {
    return res.status(400).json({ error: 'Invalid appid' });
  }

  const range = req.query.range ?? 'day';

  // All-time peak — independent of range
  const { rows: peakRows } = await pool.query(
    'SELECT MAX(peak_ccu) AS all_time_peak FROM daily_peaks WHERE appid = $1',
    [appid],
  );
  const all_time_peak = peakRows[0]?.all_time_peak ?? null;

  let rows;

  if (range === 'day') {
    // Raw 60-min snapshots for the last 24 hours
    ({ rows } = await pool.query(
      `SELECT ccu, captured_at AS time
       FROM ccu_snapshots
       WHERE appid = $1
         AND captured_at >= NOW() - INTERVAL '24 hours'
       ORDER BY captured_at ASC`,
      [appid],
    ));
  } else if (range === 'month') {
    ({ rows } = await pool.query(
      `SELECT peak_ccu AS ccu, peak_date AS time
       FROM daily_peaks
       WHERE appid = $1
         AND peak_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY peak_date ASC`,
      [appid],
    ));
  } else if (range === 'week') {
    ({ rows } = await pool.query(
      `SELECT peak_ccu AS ccu, peak_date AS time
       FROM daily_peaks
       WHERE appid = $1
         AND peak_date > CURRENT_DATE - INTERVAL '7 days'
       ORDER BY peak_date ASC`,
      [appid],
    ));
  } else {
    return res.status(400).json({ error: 'range must be day, week, or month' });
  }

  res.json({ appid, range, data: rows, all_time_peak });
}));

export default router;
