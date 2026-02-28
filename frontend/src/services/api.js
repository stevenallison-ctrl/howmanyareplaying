const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  getLive:       () => request('/live'),
  getLeaderboard:(view = 'live') => request(`/leaderboard?view=${view}`),
  getHistory:    (appid, range = 'day') => request(`/history/${appid}?range=${range}`),
  getGame:       (appid) => request(`/games/${appid}`),
  getWishlist:   () => request('/wishlist'),
  searchGames:   (q) => request(`/search?q=${encodeURIComponent(q)}`),
  getMovers:     () => request('/movers'),
  getRecords:    () => request('/records'),
};
