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
  const range = searchParams.get('range') ?? 'week';
  const VALID_RANGES = new Set(['week', 'month']);
  const safeRange = VALID_RANGES.has(range) ? range : 'week';

  const [game, setGame] = useState(null);
  const [gameError, setGameError] = useState(null);
  const { data: historyData, allTimePeak, loading: historyLoading, error: historyError } = useHistory(appid, safeRange);

  useEffect(() => {
    api.getGame(appid)
      .then(setGame)
      .catch((err) => setGameError(err.message));
  }, [appid]);

  useEffect(() => {
    if (!game) return;
    document.title = `${game.name} — Player Count | How Many Are Playing`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content',
      `Live and historical concurrent player count for ${game.name} on Steam.`);
  }, [game]);

  useEffect(() => {
    return () => {
      document.title = 'Top 100 Steam Games by CCU | How Many Are Playing';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content',
        'Real-time Steam concurrent player leaderboard — top 100 games updated every hour. Track player counts, trends, and historical peaks.');
    };
  }, []);

  const handleRangeChange = (newRange) => {
    setSearchParams({ range: newRange }, { replace: true });
  };

  return (
    <div className="game-detail-page">
      <Link to="/" replace className="back-link">← Back to Leaderboard</Link>

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
            <div className="game-hero__stats">
              {game.rank != null && (
                <StatBadge label="Live Rank" value={`#${game.rank}`} />
              )}
              {game.current_ccu != null && (
                <StatBadge label="Current Players" value={formatNumber(game.current_ccu)} />
              )}
              {game.peak_24h != null && (
                <StatBadge label="Peak (24h)" value={formatNumber(game.peak_24h)} />
              )}
              {allTimePeak != null && (
                <StatBadge label="All-time Peak" value={formatNumber(allTimePeak)} />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="chart-section">
        <div className="chart-section__header">
          <h2 className="chart-section__title">Player Count History</h2>
          <TimeRangeFilter value={safeRange} onChange={handleRangeChange} />
        </div>

        {historyLoading && <Spinner />}
        {historyError && <ErrorBanner message={historyError} />}
        {!historyLoading && historyData && (
          <CcuAreaChart data={historyData} range={safeRange} allTimePeak={allTimePeak} />
        )}
      </div>
    </div>
  );
}
