import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatAxisDate } from '../../utils/formatDate.js';
import { formatCompact, formatNumber } from '../../utils/formatNumber.js';
import './CcuAreaChart.css';
import './ChartTooltip.css';

function CompareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">
        {new Date(label).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        })}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip__value">
          <span
            className="chart-tooltip__dot"
            style={{ background: entry.color }}
          />
          {entry.name}: {formatNumber(entry.value)} players
        </div>
      ))}
    </div>
  );
}

export default function CcuCompareChart({ data, nameA, nameB }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data available.</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={360}>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#66c0f4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#66c0f4" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f4c066" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f4c066" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#3d5a73" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(v) => formatAxisDate(v, 'month')}
            tick={{ fill: '#8ba5be', fontSize: 11 }}
            axisLine={{ stroke: '#3d5a73' }}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fill: '#8ba5be', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CompareTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: '#8ba5be', fontSize: 12 }}>{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="a"
            name={nameA}
            stroke="#66c0f4"
            strokeWidth={2}
            fill="url(#gradA)"
            dot={false}
            activeDot={{ r: 4, fill: '#66c0f4', strokeWidth: 0 }}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="b"
            name={nameB}
            stroke="#f4c066"
            strokeWidth={2}
            fill="url(#gradB)"
            dot={false}
            activeDot={{ r: 4, fill: '#f4c066', strokeWidth: 0 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
