import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'howmanyareplaying',
  user: process.env.DB_USER || 'hmapuser',
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('[pool] unexpected error on idle client', err);
});

export default pool;
