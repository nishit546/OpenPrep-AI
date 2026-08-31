import { useState, useCallback, useEffect } from 'react';
import {
  createAttempt,
  analyzeExplanation,
  getConceptAttempts,
  getBestAttempt,
  getProgress,
  getUserConcepts,
  getUserStats,
  deleteAttempt,
  extractKeyPoints,
} from '../services/explainBackApi';

export const useExplainBack = (conceptId = null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [bestAttempt, setBestAttempt] = useState(null);
  const [progress, setProgress] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [stats, setStats] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Load concept data
  const loadConceptData = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [attemptsRes, bestRes, progressRes] = await Promise.all([
        getConceptAttempts(id),
        getBestAttempt(id).catch(() => ({ data: null })),
        getProgress(id),
      ]);
      setAttempts(attemptsRes.data || []);
      setBestAttempt(bestRes.data || null);
      setProgress(progressRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user concepts
  const loadUserConcepts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUserConcepts();
      setConcepts(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user stats
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUserStats();
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit a new attempt
  const submitAttempt = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createAttempt(data);
      // Refresh concept data if we have a conceptId
      if (conceptId) {
        await loadConceptData(conceptId);
      }
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conceptId, loadConceptData]);

  // Analyze explanation (preview)
  const analyze = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeExplanation(data);
      setAnalysis(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete an attempt
  const removeAttempt = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await deleteAttempt(id);
      if (conceptId) {
        await loadConceptData(conceptId);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conceptId, loadConceptData]);

  // Extract key points from text
  const extractPoints = useCallback(async (text) => {
    setLoading(true);
    setError(null);
    try {
      const res = await extractKeyPoints(text);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount if conceptId provided
  useEffect(() => {
    if (conceptId) {
      loadConceptData(conceptId);
    }
  }, [conceptId, loadConceptData]);

  return {
    // State
    loading,
    error,
    attempts,
    bestAttempt,
    progress,
    concepts,
    stats,
    analysis,
    
    // Actions
    loadConceptData,
    loadUserConcepts,
    loadStats,
    submitAttempt,
    analyze,
    removeAttempt,
    extractPoints,
    
    // Computed
    hasAttempts: attempts.length > 0,
    attemptCount: attempts.length,
    bestCoverage: bestAttempt?.coverageScore || 0,
  };
};