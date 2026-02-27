import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes — matches Steam's update cadence

export function useLiveData(view = 'live') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getLeaderboard(view);
      setData(result.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetchData();
    // Only auto-poll on the live view since historical aggregates don't change that frequently
    if (view === 'live') {
      const id = setInterval(fetchData, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }
  }, [fetchData, view]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}
