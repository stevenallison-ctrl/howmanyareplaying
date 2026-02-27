import React from 'react';
import { Link } from 'react-router-dom';
import RankBadge from './RankBadge.jsx';
import { formatNumber } from '../../utils/formatNumber.js';
import './LeaderboardRow.css';

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
    </tr>
  );
}
