/**
 * Formats a date/datetime string for chart axis labels.
 * range=day  → "14:30"
 * range=month/year → "Jan 15"
 */
export function formatAxisDate(value, range) {
  const d = new Date(value);
  if (range === 'day') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Full readable datetime for tooltip.
 */
export function formatTooltipDate(value, range) {
  const d = new Date(value);
  if (range === 'day') {
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * "Updated 3 minutes ago" style relative time.
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
