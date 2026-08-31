import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

/**
 * useStudyTimeBudget — React hook for fetching and mutating
 * study time budget data from the backend API.
 */
export function useStudyTimeBudget(weekKey) {
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = weekKey ? { weekKey } : {};
      const [dashRes, histRes] = await Promise.all([
        API.get('/time-budgets/dashboard', { params }),
        API.get('/time-budgets/history', { params: { weeks: 8 } }),
      ]);
      setDashboard(dashRes.data.data);
      setHistory(histRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const setBudget = useCallback(async (data) => {
    const res = await API.post('/time-budgets', data);
    await fetchDashboard();
    return res.data.data;
  }, [fetchDashboard]);

  const logStudyTime = useCallback(async (data) => {
    const res = await API.post('/time-budgets/log', data);
    await fetchDashboard();
    return res.data.data;
  }, [fetchDashboard]);

  const deleteBudget = useCallback(async (id) => {
    await API.delete(`/time-budgets/${id}`);
    await fetchDashboard();
  }, [fetchDashboard]);

  const cloneToNextWeek = useCallback(async () => {
    const res = await API.post('/time-budgets/clone');
    await fetchDashboard();
    return res.data.data;
  }, [fetchDashboard]);

  return { dashboard, history, loading, error, setBudget, logStudyTime, deleteBudget, cloneToNextWeek, refresh: fetchDashboard };
}
