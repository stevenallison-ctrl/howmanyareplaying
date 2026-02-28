import React from 'react';
import { Link } from 'react-router-dom';
import RankBadge from './RankBadge.jsx';
import { formatNumber } from '../../utils/formatNumber.js';
import './LeaderboardRow.css';

function TrendCell({ ccu, prevCcu }) {
  if (prevCcu == null || ccu == null) {
    return <td className="col-trend col-trend--neutral">&mdash;</td>;
  }
  const delta = Number(ccu) - Number(prevCcu);
  if (delta === 0) {
    return <td className="col-trend col-trend--neutral">&mdash;</td>;
  }
  const isUp = delta > 0;
  return (
    <td className={`col-trend ${isUp ? 'col-trend--up' : 'col-trend--down'}`}>
      <span className="trend-arrow">{isUp ? '▲' : '▼'}</span>
      {' '}
      {formatNumber(Math.abs(delta))}
    </td>
  );
}

export default function LeaderboardRow({ game, view = 'live' }) {
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
      {view === 'live' && (
        <td className="col-peak">{formatNumber(game.peak_24h)}</td>
      )}
      {view === 'live' && (
        <TrendCell ccu={game.ccu} prevCcu={game.prev_ccu} />
      )}
    </tr>
  );
}
