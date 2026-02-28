import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './pool.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = ['001_init.sql', '002_add_release_date.sql'];

export async function runMigrations() {
  for (const file of MIGRATIONS) {
    const sqlPath = join(__dirname, `../migrations/${file}`);
    const sql = await readFile(sqlPath, 'utf8');
    await pool.query(sql);
    logger.info(`[migrate] applied ${file}`);
  }
}
