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
    document.title = 'Top Upcoming Wishlisted Games on Steam | How Many Are Playing';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content',
      'The most-wishlisted upcoming games on Steam — unreleased titles only, ranked and refreshed daily.');
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
