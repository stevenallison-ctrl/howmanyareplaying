import React from 'react';
import './StatBadge.css';

export default function StatBadge({ label, value, sub, valueStyle }) {
  return (
    <div className="stat-badge">
      <span className="stat-badge__label">{label}</span>
      <span className="stat-badge__value" style={valueStyle}>{value}</span>
      {sub && <span className="stat-badge__sub">{sub}</span>}
    </div>
  );
}
