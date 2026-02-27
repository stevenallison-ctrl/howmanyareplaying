import React from 'react';
import { formatNumber } from '../../utils/formatNumber.js';
import { formatTooltipDate } from '../../utils/formatDate.js';
import './ChartTooltip.css';

export default function ChartTooltip({ active, payload, label, range }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{formatTooltipDate(label, range)}</div>
      <div className="chart-tooltip__value">
        <span className="chart-tooltip__dot" />
        {formatNumber(payload[0].value)} players
      </div>
    </div>
  );
}
