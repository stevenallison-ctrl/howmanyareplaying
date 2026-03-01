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
    document.title = 'CCU News | How Many Are Playing';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content',
      'Gaming news about Steam concurrent player counts, CCU records, and player base changes for top games.');
    return () => {
      document.title = 'Top 100 Steam Games by CCU | How Many Are Playing';
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
