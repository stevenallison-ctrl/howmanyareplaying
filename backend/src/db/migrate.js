import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './pool.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const sqlPath = join(__dirname, '../migrations/001_init.sql');
  const sql = await readFile(sqlPath, 'utf8');
  await pool.query(sql);
  logger.info('[migrate] migrations applied');
}
