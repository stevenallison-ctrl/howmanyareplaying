/**
 * Formats a CCU number with thousands separators.
 * e.g. 1234567 → "1,234,567"
 */
export function formatNumber(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

/**
 * Compact format for axis labels.
 * e.g. 1234567 → "1.2M", 123456 → "123K"
 */
export function formatCompact(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
