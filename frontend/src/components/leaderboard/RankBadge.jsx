import React from 'react';
import './RankBadge.css';

export default function RankBadge({ rank }) {
  const cls =
    rank === 1 ? 'rank-badge--gold'
    : rank === 2 ? 'rank-badge--silver'
    : rank === 3 ? 'rank-badge--bronze'
    : '';
  return <span className={`rank-badge ${cls}`}>{rank}</span>;
}
