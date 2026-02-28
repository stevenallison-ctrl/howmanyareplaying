import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import logger from './utils/logger.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN ?? '*',
  }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Prevent Cloudflare and other proxies from caching API responses
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // API routes
  app.use(apiRouter);

  // 404 handler for unmatched API paths
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err, _req, res, _next) => {
    logger.error('[app] unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
