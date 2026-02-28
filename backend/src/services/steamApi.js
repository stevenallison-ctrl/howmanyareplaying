import logger from '../utils/logger.js';

const WISHLIST_BASE =
  'https://store.steampowered.com/search/results/?filter=wishlist&json=1&count=25&ndl=1';
const APPID_FROM_LOGO = /steam\/apps\/(\d+)\//;

const MOST_PLAYED_URL =
  'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/?format=json';

const APP_DETAILS_BASE =
  'https://store.steampowered.com/api/appdetails';

const CURRENT_PLAYERS_BASE =
  'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1';

/**
 * Returns the top 100 games with their current CCU.
 * @returns {Promise<Array<{rank: number, appid: number, peak_in_game: number}>>}
 */
export async function fetchTopGames() {
  const url = process.env.STEAM_API_KEY
    ? `${MOST_PLAYED_URL}&key=${process.env.STEAM_API_KEY}`
    : MOST_PLAYED_URL;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam API responded ${res.status} for GetMostPlayedGames`);
  }
  const json = await res.json();
  const ranks = json?.response?.ranks;
  if (!Array.isArray(ranks)) {
    throw new Error('Unexpected Steam API response shape');
  }
  return ranks.slice(0, 100);
}

/**
 * Returns the current concurrent player count for a single appid.
 * Uses the public GetNumberOfCurrentPlayers endpoint (no API key needed).
 * Returns null on failure.
 * @param {number} appid
 * @returns {Promise<number|null>}
 */
export async function fetchGameCCU(appid) {
  try {
    const res = await fetch(`${CURRENT_PLAYERS_BASE}?appid=${appid}`);
    if (!res.ok) return null;
    const json = await res.json();
    const count = json?.response?.player_count;
    return typeof count === 'number' && count >= 0 ? count : null;
  } catch (err) {
    logger.warn(`[steamApi] fetchGameCCU(${appid}) failed:`, err.message);
    return null;
  }
}

/**
 * Fetches basic metadata (name, header_image, release_date) for a single appid.
 * Returns null if the app is not found or the API call fails.
 * @param {number} appid
 * @returns {Promise<{name: string, header_image: string|null, release_date: string|null} | null>}
 */
export async function fetchAppDetails(appid) {
  try {
    const res = await fetch(
      `${APP_DETAILS_BASE}?appids=${appid}&filters=basic,release_date`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.[appid]?.data;
    if (!data) return null;

    let release_date = null;
    const rd = data.release_date;
    if (rd && !rd.coming_soon && rd.date) {
      const parsed = new Date(rd.date);
      if (!isNaN(parsed.getTime())) {
        release_date = parsed.toISOString().slice(0, 10);
      }
    }

    return {
      name: data.name ?? `App ${appid}`,
      header_image: data.header_image ?? null,
      release_date,
      coming_soon: Boolean(rd?.coming_soon),
    };
  } catch (err) {
    logger.warn(`[steamApi] fetchAppDetails(${appid}) failed:`, err.message);
    return null;
  }
}

/**
 * Fetches actual concurrent player counts for multiple appids in parallel.
 * Batches 10 requests at a time. Appids where the fetch fails are omitted
 * from the returned Map.
 * @param {number[]} appids
 * @returns {Promise<Map<number, number>>}
 */
export async function fetchCurrentPlayers(appids) {
  const BATCH_SIZE = 10;
  const result = new Map();
  for (let i = 0; i < appids.length; i += BATCH_SIZE) {
    const batch = appids.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((appid) =>
        fetchGameCCU(appid).then((count) => ({ appid, count })),
      ),
    );
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value.count != null) {
        result.set(r.value.appid, r.value.count);
      }
    }
  }
  return result;
}

/**
 * Fetches the top most-wishlisted UPCOMING games on Steam.
 * Fetches 5 pages (125 games), deduplicates, then batch-checks each game's
 * release status via appdetails — only games still marked coming_soon are kept.
 * @returns {Promise<Array<{rank: number, appid: number, name: string, logo: string}>>}
 */
export async function fetchWishlistedGames() {
  const results = [];
  const PAGE_SIZE = 25;
  const PAGES = 5; // fetch extra so we have enough after filtering released games

  for (let page = 0; page < PAGES; page++) {
    const start = page * PAGE_SIZE;
    const res = await fetch(`${WISHLIST_BASE}&start=${start}`, {
      headers: { 'User-Agent': 'howmanyareplaying.com/wishlist' },
    });
    if (!res.ok) throw new Error(`Steam wishlist API responded ${res.status} at start=${start}`);
    const json = await res.json();
    const items = json?.items;
    if (!Array.isArray(items)) throw new Error(`Unexpected wishlist response shape at start=${start}`);
    for (const item of items) {
      const match = item.logo?.match(APPID_FROM_LOGO);
      if (!match || !item.name) continue;
      results.push({ appid: parseInt(match[1], 10), name: item.name, logo: item.logo });
    }
  }

  // Deduplicate by appid (first occurrence = highest rank)
  const seen = new Set();
  const deduped = [];
  for (const entry of results) {
    if (!seen.has(entry.appid)) {
      seen.add(entry.appid);
      deduped.push(entry);
    }
  }

  // Filter to only upcoming (unreleased) games via appdetails coming_soon flag.
  // Batch 10 at a time to avoid hammering Steam's API.
  const BATCH_SIZE = 10;
  const upcoming = [];
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((entry) =>
        fetchAppDetails(entry.appid).then((d) => ({ entry, comingSoon: d?.coming_soon ?? false })),
      ),
    );
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value.comingSoon) {
        upcoming.push(r.value.entry);
      }
    }
  }

  return upcoming.slice(0, 100).map((entry, i) => ({ rank: i + 1, ...entry }));
}
