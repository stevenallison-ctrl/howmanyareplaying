import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useHistory } from '../hooks/useHistory.js';
import { api } from '../services/api.js';
import CcuAreaChart from '../components/charts/CcuAreaChart.jsx';
import RankHistoryChart from '../components/charts/RankHistoryChart.jsx';
import HourlyChart from '../components/charts/HourlyChart.jsx';
import TimeRangeFilter from '../components/filters/TimeRangeFilter.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatNumber.js';
import { formatShortDate } from '../utils/formatDate.js';
import './GameDetail.css';

const VALID_CCU_RANGES  = new Set(['week', 'month', '3m', '6m', '1y', 'all']);
const VALID_RANK_RANGES = new Set(['3m', '6m', '1y', 'all']);

export default function GameDetail() {
  const { appid } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const range     = searchParams.get('range')      ?? 'week';
  const rankRange = searchParams.get('rankRange')  ?? '3m';
  const safeRange     = VALID_CCU_RANGES.has(range)      ? range     : 'week';
  const safeRankRange = VALID_RANK_RANGES.has(rankRange) ? rankRange : '3m';

  const [game, setGame]               = useState(null);
  const [gameError, setGameError]     = useState(null);
  const [rankData, setRankData]       = useState(null);
  const [hourlyData, setHourlyData]   = useState(null);

  const { data: historyData, allTimePeak, allTimePeakDate, loading: historyLoading, error: historyError } =
    useHistory(appid, safeRange);

  useEffect(() => {
    api.getGame(appid)
      .then(setGame)
      .catch((err) => setGameError(err.message));
  }, [appid]);

  useEffect(() => {
    setHourlyData(null);
    api.getHourlyPattern(appid)
      .then((result) => setHourlyData(result.data))
      .catch(() => setHourlyData([]));
  }, [appid]);

  useEffect(() => {
    setRankData(null);
    api.getRankHistory(appid, safeRankRange)
      .then((result) => setRankData(result.data))
      .catch(() => setRankData([]));
  }, [appid, safeRankRange]);

  useEffect(() => {
    if (!game) return;
    const title = `${game.name} — Player Count | How Many Are Playing`;
    const desc  = `Live and historical concurrent player count for ${game.name} on Steam.`;
    const url   = `https://howmanyareplaying.com/game/${game.appid}`;

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
    if (game.header_image) {
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', game.header_image);
    }

    // JSON-LD structured data
    document.getElementById('game-jsonld')?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'game-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: game.name,
      url,
      description: desc,
      gamePlatform: 'PC',
      applicationCategory: 'Game',
    });
    document.head.appendChild(script);
  }, [game]);

  useEffect(() => {
    // Canonical tag for this game page
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://howmanyareplaying.com/game/${appid}`);

    return () => {
      const dTitle = 'Top 100 Steam Games by CCU | How Many Are Playing';
      const dDesc  = 'Real-time Steam concurrent player leaderboard — top 100 games updated every hour. Track player counts, trends, and historical peaks.';
      const dUrl   = 'https://howmanyareplaying.com/';
      document.title = dTitle;
      document.querySelector('meta[name="description"]')?.setAttribute('content', dDesc);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', dTitle);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', dUrl);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', dDesc);
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', '');
      document.getElementById('game-jsonld')?.remove();
      canonical.setAttribute('href', dUrl);
    };
  }, [appid]);

  const handleRangeChange = (newRange) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('range', newRange);
      return next;
    }, { replace: true });
  };

  const handleRankRangeChange = (newRange) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('rankRange', newRange);
      return next;
    }, { replace: true });
  };

  const momValue = game?.mom_pct != null
    ? `${game.mom_pct >= 0 ? '▲' : '▼'} ${Math.abs(game.mom_pct)}%`
    : null;
  const momColor = game?.mom_pct != null
    ? (game.mom_pct >= 0 ? '#4caf50' : '#f44336')
    : undefined;

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
                <StatBadge
                  label="All-time Peak"
                  value={formatNumber(allTimePeak)}
                  sub={formatShortDate(allTimePeakDate)}
                />
              )}
              {momValue && (
                <StatBadge
                  label="vs Last Month"
                  value={momValue}
                  valueStyle={{ color: momColor }}
                />
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

      <div className="chart-section">
        <div className="chart-section__header">
          <h2 className="chart-section__title">Rank History</h2>
          <TimeRangeFilter value={safeRankRange} onChange={handleRankRangeChange} rankMode={true} />
        </div>
        {rankData === null && <Spinner />}
        {rankData !== null && (
          <RankHistoryChart data={rankData} range={safeRankRange} />
        )}
      </div>

      <div className="chart-section">
        <h2 className="chart-section__title">Peak Hours</h2>
        {hourlyData === null && <Spinner />}
        {hourlyData !== null && <HourlyChart data={hourlyData} />}
      </div>
    </div>
  );
}
