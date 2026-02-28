import { Router } from 'express';
import liveRouter from './live.js';
import historyRouter from './history.js';
import gamesRouter from './games.js';
import leaderboardRouter from './leaderboard.js';
import wishlistRouter from './wishlist.js';
import searchRouter from './search.js';
import moversRouter from './movers.js';
import recordsRouter from './records.js';
import sitemapRouter from './sitemap.js';

const router = Router();

router.use('/api/live', liveRouter);
router.use('/api/leaderboard', leaderboardRouter);
router.use('/api/history', historyRouter);
router.use('/api/games', gamesRouter);
router.use('/api/wishlist', wishlistRouter);
router.use('/api/search', searchRouter);
router.use('/api/movers', moversRouter);
router.use('/api/records', recordsRouter);
router.use('/sitemap.xml', sitemapRouter);

export default router;
