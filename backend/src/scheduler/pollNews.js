import Parser from 'rss-parser';
import pool from '../db/pool.js';
import logger from '../utils/logger.js';

const RSS_FEEDS = [
  { name: 'PC Gamer',           url: 'https://www.pcgamer.com/rss/' },
  { name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed' },
  { name: 'Eurogamer',          url: 'https://www.eurogamer.net/?format=rss' },
  { name: 'Kotaku',             url: 'https://kotaku.com/rss' },
  { name: 'IGN',                url: 'https://feeds.ign.com/ign/all' },
  { name: 'Polygon',            url: 'https://www.polygon.com/rss/index.xml' },
  { name: 'PCGamesN',           url: 'https://www.pcgamesn.com/feeds/all' },
  { name: 'GameSpot',           url: 'https://www.gamespot.com/feeds/news' },
  { name: 'VGC',                url: 'https://www.videogameschronicle.com/feed/' },
  { name: 'PC Invasion',        url: 'https://www.pcinvasion.com/feed/' },
];

const CCU_KEYWORDS = [
  'concurrent',
  'player count',
  'ccu',
  'steam peak',
  'peak players',
  'million players',
  'players online',
  'active players',
  'playerbase',
  'player base',
  'simultaneous players',
  'steam charts',
  'steamcharts',
];

/**
 * Scrapes RSS feeds from major gaming publications and stores articles
 * that mention leaderboard games and CCU/player-count topics.
 * Runs daily at 9AM EST; also called once on first deploy.
 */
export async function pollNews() {
  logger.info('[pollNews] starting news scrape');

  // 1. Load current leaderboard games
  const { rows: games } = await pool.query(`
    SELECT lc.appid, g.name
    FROM leaderboard_cache lc
    JOIN games g ON g.appid = lc.appid
  `);

  if (games.length === 0) {
    logger.warn('[pollNews] leaderboard is empty, skipping scrape');
    return;
  }

  // Build name → appid map; skip very short names to avoid false positives
  const gameMap = new Map();
  for (const { appid, name } of games) {
    if (name && name.length >= 4) {
      gameMap.set(name.toLowerCase(), appid);
    }
  }
  const gameNames = [...gameMap.keys()]; // sorted by length desc for greedy match
  gameNames.sort((a, b) => b.length - a.length);

  const parser = new Parser({ timeout: 10000 });
  let inserted = 0;

  // 2. Fetch and filter each feed
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items ?? []) {
        const title   = (item.title           ?? '').trim();
        const snippet = (item.contentSnippet  ?? item.summary ?? '').trim();
        if (!title || !item.link) continue;

        const text = `${title} ${snippet}`.toLowerCase();

        // Must contain at least one CCU keyword
        if (!CCU_KEYWORDS.some((kw) => text.includes(kw))) continue;

        // Must mention a game currently on the leaderboard
        const matchedName = gameNames.find((name) => text.includes(name));
        if (!matchedName) continue;

        const appid      = gameMap.get(matchedName);
        const pubDate    = item.pubDate ? new Date(item.pubDate) : null;
        const cleanSnip  = snippet.slice(0, 500) || null;

        const { rowCount } = await pool.query(
          `INSERT INTO news_articles (appid, title, url, source_name, snippet, published_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (url) DO NOTHING`,
          [appid, title, item.link, feed.name, cleanSnip, pubDate],
        );
        inserted += rowCount;
      }
    } catch (err) {
      logger.warn(`[pollNews] failed to fetch ${feed.name}: ${err.message}`);
    }
  }

  // 3. Prune articles older than 30 days
  await pool.query(
    `DELETE FROM news_articles WHERE scraped_at < NOW() - INTERVAL '30 days'`,
  );

  logger.info(`[pollNews] done — ${inserted} new article(s) inserted`);
}
