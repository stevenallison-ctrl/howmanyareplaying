import React from 'react';
import './TimeRangeFilter.css';

const RANGES = [
  { value: 'day',   label: 'Last 24h Peak' },
  { value: 'week',  label: 'Last 7 Days Avg Peak' },
  { value: 'month', label: 'Last 30 Days Avg Peak' },
];

export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div className="time-range-filter" role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button
          key={r.value}
          className={`range-tab ${value === r.value ? 'range-tab--active' : ''}`}
          onClick={() => onChange(r.value)}
          aria-pressed={value === r.value}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
