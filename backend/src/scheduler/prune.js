import pool from '../db/pool.js';
import logger from '../utils/logger.js';

/**
 * Prune job — runs at 01:00 UTC.
 * Deletes ccu_snapshots older than 30 days to keep table size in check.
 */
export async function pruneSnapshots() {
  logger.info('[prune] deleting snapshots older than 30 days');
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM ccu_snapshots WHERE captured_at < NOW() - INTERVAL '30 days'`,
    );
    logger.info(`[prune] deleted ${rowCount} rows`);
  } catch (err) {
    logger.error('[prune] failed:', err.message);
  }
}
