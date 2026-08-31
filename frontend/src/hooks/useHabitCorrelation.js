import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

/**
 * useHabitCorrelation — React hook that fetches habit correlation data
 * from the backend and exposes loading, error, and data states.
 */
export function useHabitCorrelation() {
  const [summary, setSummary] = useState(null);
  const [byHour, setByHour] = useState([]);
  const [byDay, setByDay] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, hourRes, dayRes, scheduleRes] = await Promise.all([
        API.get('/habit-correlations/summary'),
        API.get('/habit-correlations/by-hour'),
        API.get('/habit-correlations/by-day'),
        API.get('/habit-correlations/optimal-schedule'),
      ]);

      setSummary(summaryRes.data.data);
      setByHour(hourRes.data.data);
      setByDay(dayRes.data.data);
      setSchedule(scheduleRes.data.data);
    } catch (err) {
      console.error('Failed to load habit correlations:', err);
      setError(err.response?.data?.error || 'Failed to load correlation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const recordObservation = useCallback(async (data) => {
    try {
      const res = await API.post('/habit-correlations/record', data);
      // Refresh data after recording
      await fetchAll();
      return res.data.data;
    } catch (err) {
      console.error('Failed to record observation:', err);
      throw err;
    }
  }, [fetchAll]);

  return {
    summary,
    byHour,
    byDay,
    schedule,
    loading,
    error,
    refresh: fetchAll,
    recordObservation,
  };
}
