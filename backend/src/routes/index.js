import { Router } from 'express';
import liveRouter from './live.js';
import historyRouter from './history.js';
import gamesRouter from './games.js';
import leaderboardRouter from './leaderboard.js';

const router = Router();

router.use('/api/live', liveRouter);
router.use('/api/leaderboard', leaderboardRouter);
router.use('/api/history', historyRouter);
router.use('/api/games', gamesRouter);

export default router;
