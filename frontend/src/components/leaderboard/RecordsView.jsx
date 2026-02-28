import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Spinner from '../ui/Spinner.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import { formatNumber } from '../../utils/formatNumber.js';
import { formatRelativeTime } from '../../utils/formatDate.js';
import './RecordsView.css';

const WINDOW_LABELS = {
  7:  'New 7-day high',
  30: 'New 30-day high',
  90: 'New 90-day high',
};

function RecordCard({ record }) {
  const label   = WINDOW_LABELS[record.window_days] ?? `New ${record.window_days}-day high`;
  const relTime = formatRelativeTime(new Date(record.record_at));

  return (
    <Link to={`/game/${record.appid}`} className="record-card">
      {record.header_image && (
        <img
          src={record.header_image}
          alt=""
          className="record-card__thumb"
          loading="lazy"
          width={92}
          height={43}
        />
      )}
      <div className="record-card__body">
        <span className="record-card__name">{record.name}</span>
        <span className="record-card__label">{label}</span>
        <span className="record-card__ccu">{formatNumber(record.ccu)} players</span>
      </div>
      <span className="record-card__time">{relTime}</span>
    </Link>
  );
}

export default function RecordsView() {
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.getRecords()
      .then((result) => { setRecords(result.data); setError(null); })
      .catch((err)   => setError(err.message))
      .finally(()    => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" />;
  if (error)   return <ErrorBanner message={error} />;

  if (!records || records.length === 0) {
    return (
      <p className="records-empty">
        No records yet — check back after the next poll cycle.
      </p>
    );
  }

  return (
    <div className="records-feed">
      {records.map((record) => (
        <RecordCard key={record.id} record={record} />
      ))}
    </div>
  );
}
