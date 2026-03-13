import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { NewsCard } from '../components/news/NewsFeedPreview.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import '../components/news/NewsFeedPreview.css';
import './News.css';

export default function News() {
  const [articles, setArticles] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    const title = 'CCU News | How Many Are Playing';
    const desc  = 'Gaming news about Steam concurrent player counts, CCU records, and player base changes for top games.';
    const url   = 'https://howmanyareplaying.com/news';

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    return () => {
      const dTitle = 'Top 100 Steam Games by CCU | How Many Are Playing';
      const dDesc  = 'Real-time Steam concurrent player leaderboard — top 100 games updated every hour. Track player counts, trends, and historical peaks.';
      const dUrl   = 'https://howmanyareplaying.com/';
      document.title = dTitle;
      document.querySelector('meta[name="description"]')?.setAttribute('content', dDesc);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', dTitle);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', dUrl);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', dDesc);
      canonical.setAttribute('href', dUrl);
    };
  }, []);

  useEffect(() => {
    api.getNews()
      .then((result) => { setArticles(result.data); setError(null); })
      .catch((err)   => setError(err.message))
      .finally(()    => setLoading(false));
  }, []);

  return (
    <div className="news-page">
      <Link to="/" className="back-link">← Back to Leaderboard</Link>

      <div className="news-page__header">
        <h1 className="news-page__title">CCU News</h1>
        <p className="news-page__subtitle">
          Articles about player counts, records, and Steam CCU from top gaming publications —
          updated daily at 9AM EST.
        </p>
      </div>

      {loading && <Spinner size="lg" />}
      {error   && <ErrorBanner message={error} />}

      {articles && articles.length === 0 && (
        <p className="news-page__empty">
          No articles yet — check back after the next daily update.
        </p>
      )}

      {articles && articles.length > 0 && (
        <div className="news-feed">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
