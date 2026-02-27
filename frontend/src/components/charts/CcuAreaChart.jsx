import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';
import { formatAxisDate } from '../../utils/formatDate.js';
import { formatCompact } from '../../utils/formatNumber.js';
import './CcuAreaChart.css';

export default function CcuAreaChart({ data, range }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this range yet.</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ccuGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#66c0f4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#66c0f4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#3d5a73" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(v) => formatAxisDate(v, range)}
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
          <Tooltip content={<ChartTooltip range={range} />} />
          <Area
            type="monotone"
            dataKey="ccu"
            stroke="#66c0f4"
            strokeWidth={2}
            fill="url(#ccuGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#66c0f4', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
