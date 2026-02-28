import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

const VALID_VIEWS = new Set(['live', 'today', '7d', '30d', '90d', '180d', '365d']);

export function useLiveData(view = 'live') {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null); // { data_days, period_days }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    if (!VALID_VIEWS.has(view)) {
      setLoading(false);
      return;
    }
    try {
      const result = await api.getLeaderboard(view);
      setData(result.data);
      setMeta({ data_days: result.data_days, period_days: result.period_days });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    if (!VALID_VIEWS.has(view)) {
      setLoading(false);
      setData(null);
      setMeta(null);
      return;
    }
    setLoading(true);
    setData(null);
    setMeta(null);
    fetchData();
    if (view === 'live') {
      const id = setInterval(fetchData, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }
  }, [fetchData, view]);

  return { data, meta, loading, error, lastUpdated, refetch: fetchData };
}
