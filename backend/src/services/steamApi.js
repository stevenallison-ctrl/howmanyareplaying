import logger from '../utils/logger.js';

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
 * Fetches basic metadata (name + header_image) for a single appid.
 * Returns null if the app is not found or the API call fails.
 * @param {number} appid
 * @returns {Promise<{name: string, header_image: string} | null>}
 */
export async function fetchAppDetails(appid) {
  try {
    const res = await fetch(
      `${APP_DETAILS_BASE}?appids=${appid}&filters=basic`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.[appid]?.data;
    if (!data) return null;
    return {
      name: data.name ?? `App ${appid}`,
      header_image: data.header_image ?? null,
    };
  } catch (err) {
    logger.warn(`[steamApi] fetchAppDetails(${appid}) failed:`, err.message);
    return null;
  }
}
