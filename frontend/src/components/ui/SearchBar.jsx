import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api.js';
import './SearchBar.css';

const DEBOUNCE_MS = 250;

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const location = useLocation();

  // Clear on navigation
  useEffect(() => {
    clearTimeout(timerRef.current);
    setQuery('');
    setResults([]);
    setOpen(false);
  }, [location.pathname]);

  const search = useCallback((q) => {
    clearTimeout(timerRef.current);
    if (q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      api.searchGames(q)
        .then((result) => {
          setResults(result.data);
          setOpen(result.data.length > 0);
        })
        .catch(() => {
          setResults([]);
          setOpen(false);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="search-bar__input-wrap">
        <span className="search-bar__icon" aria-hidden="true">&#128269;</span>
        <input
          type="search"
          className="search-bar__input"
          placeholder="Search games\u2026"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          aria-label="Search games"
          autoComplete="off"
        />
        {loading && <span className="search-bar__spinner" aria-hidden="true" />}
        {query && !loading && (
          <button className="search-bar__clear" onClick={handleClear} aria-label="Clear search">\u2715</button>
        )}
      </div>

      {open && (
        <ul className="search-dropdown" role="listbox" aria-label="Search results">
          {results.map((game) => (
            <li key={game.appid} role="option">
              <Link
                to={`/game/${game.appid}`}
                className="search-dropdown__item"
                onClick={() => setOpen(false)}
              >
                {game.header_image && (
                  <img
                    src={game.header_image}
                    alt=""
                    className="search-dropdown__thumb"
                    loading="lazy"
                    width={46}
                    height={22}
                  />
                )}
                <span className="search-dropdown__name">{game.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
