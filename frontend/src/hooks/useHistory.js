import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export function useHistory(appid, range) {
  const [data, setData] = useState(null);
  const [allTimePeak, setAllTimePeak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!appid) return;
    setLoading(true);
    setError(null);
    api.getHistory(appid, range)
      .then((result) => {
        setData(result.data);
        setAllTimePeak(result.all_time_peak ?? null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [appid, range]);

  return { data, allTimePeak, loading, error };
}
