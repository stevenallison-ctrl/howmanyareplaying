import React from 'react';
import './StatBadge.css';

export default function StatBadge({ label, value }) {
  return (
    <div className="stat-badge">
      <span className="stat-badge__label">{label}</span>
      <span className="stat-badge__value">{value}</span>
    </div>
  );
}
