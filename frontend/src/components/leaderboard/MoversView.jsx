import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import RankBadge from './RankBadge.jsx';
import Spinner from '../ui/Spinner.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import { formatNumber } from '../../utils/formatNumber.js';
import './MoversView.css';

function MoverRow({ game }) {
  const isUp  = game.delta > 0;
  const sign  = isUp ? '+' : '';
  const pct   = game.pct_change != null ? `${sign}${Number(game.pct_change).toFixed(1)}%` : null;

  return (
    <tr className="leaderboard-row">
      <td className="col-rank">
        <RankBadge rank={game.rank} />
      </td>
      <td className="col-game">
        <Link to={`/game/${game.appid}`} className="game-link">
          {game.header_image && (
            <img
              src={game.header_image}
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
      <td className="col-ccu">{formatNumber(game.ccu)}</td>
      <td className={`col-move ${isUp ? 'col-move--up' : 'col-move--down'}`}>
        <span className="move-arrow">{isUp ? '▲' : '▼'}</span>
        {' '}{pct}
      </td>
    </tr>
  );
}

function MoversTable({ title, rows, emptyMsg }) {
  return (
    <div className="movers-half">
      <h2 className="movers-half__title">{title}</h2>
      <div className="leaderboard-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-game">Game</th>
              <th className="col-ccu">Players</th>
              <th className="col-move">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={4} className="movers-empty">{emptyMsg}</td></tr>
              : rows.map((g) => <MoverRow key={g.appid} game={g} />)
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MoversView() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.getMovers()
      .then((result) => { setData(result); setError(null); })
      .catch((err)   => setError(err.message))
      .finally(()    => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" />;
  if (error)   return <ErrorBanner message={error} />;
  if (!data)   return null;

  return (
    <div className="movers-grid">
      <MoversTable
        title="Top Gainers"
        rows={data.gainers}
        emptyMsg="No gainers data yet — available after the second poll."
      />
      <MoversTable
        title="Top Losers"
        rows={data.losers}
        emptyMsg="No losers data yet — available after the second poll."
      />
    </div>
  );
}
