import React from 'react';
import LeaderboardRow from './LeaderboardRow.jsx';
import './LeaderboardTable.css';

const CCU_COLUMN_LABELS = {
  live:  'Current Players',
  today: 'Peak Today',
  '7d':  'Avg Peak (7d)',
  '30d': 'Avg Peak (30d)',
  '90d': 'Avg Peak (90d)',
  '180d':'Avg Peak (180d)',
  '365d':'Avg Peak (1y)',
};

export default function LeaderboardTable({ games, view = 'live' }) {
  const ccuLabel = CCU_COLUMN_LABELS[view] ?? 'Players';

  return (
    <div className="leaderboard-wrapper">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th className="col-game">Game</th>
            <th className="col-ccu">{ccuLabel}</th>
            {view === 'live' && <th className="col-peak">24h Peak</th>}
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <LeaderboardRow key={game.appid} game={game} view={view} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
