import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import RankBadge from '../components/leaderboard/RankBadge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import './Wishlist.css';

export default function Wishlist() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const title = 'Top Upcoming Wishlisted Games on Steam | How Many Are Playing';
    const desc  = 'The most-wishlisted upcoming games on Steam — unreleased titles only, ranked and refreshed daily.';
    const url   = 'https://howmanyareplaying.com/wishlist';

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    return () => {
      const dTitle = 'Top 100 Steam Games by CCU | How Many Are Playing';
      const dDesc  = 'Real-time Steam concurrent player leaderboard — top 100 games updated every hour. Track player counts, trends, and historical peaks.';
      const dUrl   = 'https://howmanyareplaying.com/';
      document.title = dTitle;
      document.querySelector('meta[name="description"]')?.setAttribute('content', dDesc);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', dTitle);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', dUrl);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', dDesc);
      canonical.setAttribute('href', dUrl);
    };
  }, []);

  useEffect(() => {
    api.getWishlist()
      .then((result) => {
        setData(result.data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="wishlist-page">
      <div className="wishlist-header">
        <h1 className="wishlist-title">Top Upcoming Wishlisted Games</h1>
        <p className="wishlist-subtitle">Most-wishlisted unreleased games on Steam &mdash; refreshed daily</p>
      </div>

      {loading && <Spinner size="lg" />}
      {error && <ErrorBanner message={error} />}

      {data && (
        <div className="leaderboard-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-game">Game</th>
              </tr>
            </thead>
            <tbody>
              {data.map((game) => (
                <tr key={game.appid} className="leaderboard-row">
                  <td className="col-rank">
                    <RankBadge rank={game.rank} />
                  </td>
                  <td className="col-game">
                    <Link to={`/game/${game.appid}`} className="game-link">
                      {game.logo && (
                        <img
                          src={game.logo}
                          alt=""
                          className="game-thumb"
                          loading="lazy"
                          width={92}
                          height={43}
                        />
                      )}
                      <span className="game-name">{game.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
