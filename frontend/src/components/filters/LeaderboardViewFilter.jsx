import React from 'react';
import './LeaderboardViewFilter.css';

export const LEADERBOARD_VIEWS = [
  { value: 'live',  label: 'Live',      description: 'Current concurrent players' },
  { value: 'today', label: 'Today',     description: 'Peak CCU today' },
  { value: '7d',    label: '7 Days',    description: 'Avg peak CCU — last 7 days' },
  { value: '30d',   label: '30 Days',   description: 'Avg peak CCU — last 30 days' },
  { value: '90d',   label: '90 Days',   description: 'Avg peak CCU — last 90 days' },
  { value: '180d',  label: '180 Days',  description: 'Avg peak CCU — last 180 days' },
  { value: '365d',  label: '1 Year',    description: 'Avg peak CCU — last 365 days' },
];

export default function LeaderboardViewFilter({ value, onChange }) {
  const active = LEADERBOARD_VIEWS.find((v) => v.value === value);

  return (
    <div className="view-filter">
      <div className="view-filter__tabs" role="group" aria-label="Leaderboard view">
        {LEADERBOARD_VIEWS.map((v) => (
          <button
            key={v.value}
            className={`view-tab ${value === v.value ? 'view-tab--active' : ''}`}
            onClick={() => onChange(v.value)}
            aria-pressed={value === v.value}
            title={v.description}
          >
            {v.label}
          </button>
        ))}
      </div>
      {active && (
        <p className="view-filter__desc">{active.description}</p>
      )}
    </div>
  );
}
