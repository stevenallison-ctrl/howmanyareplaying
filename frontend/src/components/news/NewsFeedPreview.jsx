import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Spinner from '../ui/Spinner.jsx';
import { formatRelativeTime } from '../../utils/formatDate.js';
import './NewsFeedPreview.css';

export function NewsCard({ article }) {
  const relTime = formatRelativeTime(new Date(article.scraped_at));

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
    >
      {article.header_image && (
        <img
          src={article.header_image}
          alt=""
          className="news-card__thumb"
          loading="lazy"
          width={92}
          height={43}
        />
      )}
      <div className="news-card__body">
        <div className="news-card__meta">
          <span className="news-source">{article.source_name}</span>
          <span className="news-card__sep">·</span>
          <span className="news-card__game">{article.game_name}</span>
          <span className="news-card__time">{relTime}</span>
        </div>
        <div className="news-card__title">{article.title}</div>
        {article.snippet && (
          <div className="news-card__snippet">{article.snippet}</div>
        )}
      </div>
    </a>
  );
}

export default function NewsFeedPreview() {
  const [articles, setArticles] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.getNewsPreview()
      .then((result) => setArticles(result.data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="news-preview">
      <div className="news-preview__header">
        <h2 className="news-preview__heading">Latest CCU News</h2>
      </div>
      <Spinner />
    </div>
  );

  if (!articles || articles.length === 0) return null;

  return (
    <div className="news-preview">
      <div className="news-preview__header">
        <h2 className="news-preview__heading">Latest CCU News</h2>
        <Link to="/news" className="news-preview__viewall">View all news →</Link>
      </div>
      <div className="news-feed">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
      <div className="news-preview__footer">
        <Link to="/news" className="news-preview__viewall">View all news →</Link>
      </div>
    </div>
  );
}
