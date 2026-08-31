import { useState, useCallback, useEffect } from 'react';
import {
  createHabit,
  getHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  archiveHabit,
  logHabit,
  useStreakFreeze,
  getStreakStatus,
  getAnalytics,
  getWeeklySummary,
  getRecommendations,
  getTodayStatus,
} from '../services/habitTrackingApi';

export const useHabitTracking = (habitId = null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [habits, setHabits] = useState([]);
  const [currentHabit, setCurrentHabit] = useState(null);
  const [streakStatus, setStreakStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [todayStatus, setTodayStatus] = useState(null);

  // Load habits
  const loadHabits = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHabits(params);
      setHabits(res.data || []);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load a single habit
  const loadHabit = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getHabit(id);
      setCurrentHabit(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load streak status
  const loadStreakStatus = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStreakStatus(id);
      setStreakStatus(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load analytics
  const loadAnalytics = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalytics(params);
      setAnalytics(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load weekly summary
  const loadWeeklySummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWeeklySummary();
      setWeeklySummary(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load recommendations
  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecommendations();
      setRecommendations(res.data || []);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load today's status
  const loadTodayStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTodayStatus();
      setTodayStatus(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new habit
  const createNewHabit = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createHabit(data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a habit
  const updateExistingHabit = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateHabit(id, data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a habit
  const deleteExistingHabit = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deleteHabit(id);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Archive a habit
  const archiveExistingHabit = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await archiveHabit(id);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Log habit completion
  const logHabitCompletion = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await logHabit(id, data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Use streak freeze
  const useFreeze = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await useStreakFreeze(id);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount if habitId provided
  useEffect(() => {
    if (habitId) {
      loadHabit(habitId);
      loadStreakStatus(habitId);
    }
  }, [habitId, loadHabit, loadStreakStatus]);

  return {
    // State
    loading,
    error,
    habits,
    currentHabit,
    streakStatus,
    analytics,
    weeklySummary,
    recommendations,
    todayStatus,

    // Actions
    loadHabits,
    loadHabit,
    loadStreakStatus,
    loadAnalytics,
    loadWeeklySummary,
    loadRecommendations,
    loadTodayStatus,
    createNewHabit,
    updateExistingHabit,
    deleteExistingHabit,
    archiveExistingHabit,
    logHabitCompletion,
    useFreeze,

    // Computed
    hasHabits: habits.length > 0,
    totalHabits: habits.length,
    activeHabits: habits.filter(h => h.isActive).length,
    hasActiveStreak: streakStatus?.currentCount > 0,
    streakCount: streakStatus?.currentCount || 0,
  };
};