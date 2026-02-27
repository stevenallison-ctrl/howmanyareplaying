import React from 'react';
import './TimeRangeFilter.css';

const RANGES = [
  { value: 'day',   label: 'Last 24h' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'year',  label: 'Last Year' },
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
