import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useHistory } from '../hooks/useHistory.js';
import { api } from '../services/api.js';
import CcuAreaChart from '../components/charts/CcuAreaChart.jsx';
import TimeRangeFilter from '../components/filters/TimeRangeFilter.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatNumber.js';
import './GameDetail.css';

export default function GameDetail() {
  const { appid } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const range = searchParams.get('range') ?? 'day';

  const [game, setGame] = useState(null);
  const [gameError, setGameError] = useState(null);
  const { data: historyData, loading: historyLoading, error: historyError } = useHistory(appid, range);

  useEffect(() => {
    api.getGame(appid)
      .then(setGame)
      .catch((err) => setGameError(err.message));
  }, [appid]);

  const handleRangeChange = (newRange) => {
    setSearchParams({ range: newRange });
  };

  const currentCcu = historyData?.[historyData.length - 1]?.ccu ?? null;
  const peakCcu = historyData ? Math.max(...historyData.map((d) => d.ccu)) : null;

  return (
    <div className="game-detail-page">
      <Link to="/" className="back-link">← Back to Leaderboard</Link>

      {gameError && <ErrorBanner message={gameError} />}

      {game && (
        <div className="game-hero">
          {game.header_image && (
            <img
              src={game.header_image}
              alt={game.name}
              className="game-hero__image"
            />
          )}
          <div className="game-hero__info">
            <h1 className="game-hero__name">{game.name}</h1>
            <p className="game-hero__appid">App ID: {game.appid}</p>
          </div>
        </div>
      )}

      <div className="game-stats">
        {currentCcu != null && (
          <StatBadge label="Current Players" value={formatNumber(currentCcu)} />
        )}
        {peakCcu != null && (
          <StatBadge label={`Peak (${range === 'day' ? '24h' : range === 'month' ? '30d' : '1y'})`} value={formatNumber(peakCcu)} />
        )}
      </div>

      <div className="chart-section">
        <div className="chart-section__header">
          <h2 className="chart-section__title">Player Count History</h2>
          <TimeRangeFilter value={range} onChange={handleRangeChange} />
        </div>

        {historyLoading && <Spinner />}
        {historyError && <ErrorBanner message={historyError} />}
        {!historyLoading && historyData && (
          <CcuAreaChart data={historyData} range={range} />
        )}
      </div>
    </div>
  );
}
