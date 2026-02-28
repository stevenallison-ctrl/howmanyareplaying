import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import CcuCompareChart from '../components/charts/CcuCompareChart.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatNumber.js';
import './Compare.css';

function GamePicker({ label, appid, onSelect }) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [open, setOpen]             = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!appid) { setSelectedGame(null); return; }
    api.getGame(appid)
      .then(setSelectedGame)
      .catch(() => setSelectedGame(null));
  }, [appid]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => {
      api.searchGames(val.trim())
        .then((res) => { setResults(res.data); setOpen(true); })
        .catch(() => {});
    }, 300);
  };

  const handleSelect = (game) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(game.appid);
  };

  const handleClear = () => {
    onSelect(null);
    setSelectedGame(null);
  };

  return (
    <div className="game-picker">
      <div className="game-picker__label">{label}</div>
      {selectedGame ? (
        <div className="game-picker__selected">
          {selectedGame.header_image && (
            <img
              src={selectedGame.header_image}
              alt=""
              className="game-picker__thumb"
              width={72}
              height={34}
            />
          )}
          <span className="game-picker__name">{selectedGame.name}</span>
          <button
            className="game-picker__clear"
            onClick={handleClear}
            aria-label="Remove game"
          >×</button>
        </div>
      ) : (
        <div className="game-picker__search">
          <input
            type="text"
            className="game-picker__input"
            placeholder="Search for a game…"
            value={query}
            onChange={handleInputChange}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {open && results.length > 0 && (
            <ul className="game-picker__dropdown">
              {results.map((g) => (
                <li
                  key={g.appid}
                  className="game-picker__option"
                  onMouseDown={() => handleSelect(g)}
                >
                  {g.header_image && (
                    <img
                      src={g.header_image}
                      alt=""
                      className="game-picker__option-thumb"
                      width={52}
                      height={24}
                    />
                  )}
                  <span>{g.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const appidA = searchParams.get('a');
  const appidB = searchParams.get('b');

  const [gameA, setGameA]       = useState(null);
  const [gameB, setGameB]       = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSelectA = (appid) => {
    const params = {};
    if (appid) params.a = String(appid);
    if (appidB) params.b = appidB;
    setSearchParams(params);
  };

  const handleSelectB = (appid) => {
    const params = {};
    if (appidA) params.a = appidA;
    if (appid) params.b = String(appid);
    setSearchParams(params);
  };

  useEffect(() => {
    if (!appidA || !appidB) {
      setChartData(null);
      setGameA(null);
      setGameB(null);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      api.getGame(appidA),
      api.getGame(appidB),
      api.getHistory(appidA, 'month'),
      api.getHistory(appidB, 'month'),
    ])
      .then(([gA, gB, histA, histB]) => {
        setGameA(gA);
        setGameB(gB);

        // Merge daily peaks by date
        const mapB = new Map((histB.data ?? []).map((d) => [d.time, d.ccu]));
        const merged = (histA.data ?? []).map((d) => ({
          time: d.time,
          a: d.ccu,
          b: mapB.get(d.time) ?? null,
        }));
        setChartData(merged);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [appidA, appidB]);

  useEffect(() => {
    if (gameA && gameB) {
      document.title = `${gameA.name} vs ${gameB.name} | How Many Are Playing`;
    } else {
      document.title = 'Compare Games | How Many Are Playing';
    }
    return () => {
      document.title = 'Top 100 Steam Games by CCU | How Many Are Playing';
    };
  }, [gameA, gameB]);

  return (
    <div className="compare-page">
      <h1 className="compare-title">Compare Games</h1>
      <p className="compare-subtitle">
        Select two games to overlay their 30-day player count history.
      </p>

      <div className="compare-pickers">
        <GamePicker label="Game A" appid={appidA} onSelect={handleSelectA} />
        <div className="compare-vs">VS</div>
        <GamePicker label="Game B" appid={appidB} onSelect={handleSelectB} />
      </div>

      {loading && <Spinner size="lg" />}
      {error && <ErrorBanner message={error} />}

      {!loading && chartData && gameA && gameB && (
        <div className="compare-chart-section">
          <h2 className="compare-chart-title">
            <Link to={`/game/${gameA.appid}`}>{gameA.name}</Link>
            {' vs '}
            <Link to={`/game/${gameB.appid}`}>{gameB.name}</Link>
            {' — Last 30 Days'}
          </h2>
          <CcuCompareChart data={chartData} nameA={gameA.name} nameB={gameB.name} />
          <div className="compare-stats">
            <div className="compare-stat">
              <span className="compare-stat__dot compare-stat__dot--a" />
              <span className="compare-stat__name">{gameA.name}</span>
              {gameA.current_ccu != null && (
                <span className="compare-stat__ccu">
                  {formatNumber(gameA.current_ccu)} live
                </span>
              )}
            </div>
            <div className="compare-stat">
              <span className="compare-stat__dot compare-stat__dot--b" />
              <span className="compare-stat__name">{gameB.name}</span>
              {gameB.current_ccu != null && (
                <span className="compare-stat__ccu">
                  {formatNumber(gameB.current_ccu)} live
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {!appidA && !appidB && (
        <p className="compare-hint">
          Try comparing popular games like{' '}
          <Link to="/compare?a=730&b=570">CS2 vs Dota 2</Link>.
        </p>
      )}
    </div>
  );
}
