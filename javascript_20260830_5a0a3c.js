import { useState, useCallback, useEffect } from 'react';
import {
  generateSet,
  getSet,
  getUserSets,
  updateResults,
  completeSet,
  getBenefit,
  getStats,
  deleteSet,
  getConfusablePairs,
} from '../services/interleavedPracticeApi';

export const useInterleavedPractice = (setId = null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSet, setCurrentSet] = useState(null);
  const [sets, setSets] = useState([]);
  const [benefit, setBenefit] = useState(null);
  const [stats, setStats] = useState(null);
  const [confusablePairs, setConfusablePairs] = useState([]);
  const [progress, setProgress] = useState({
    currentIndex: 0,
    answers: {},
    correctCount: 0,
  });

  // Load a specific set
  const loadSet = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getSet(id);
      setCurrentSet(res.data);
      // Initialize progress
      const questions = res.data.questionSequence || [];
      setProgress({
        currentIndex: 0,
        answers: {},
        correctCount: 0,
        totalQuestions: questions.length,
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all sets
  const loadSets = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUserSets(params);
      setSets(res.data.sets || []);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStats();
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load benefit
  const loadBenefit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBenefit();
      setBenefit(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate a new set
  const createSet = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateSet(data);
      setCurrentSet(res.data.practiceSet);
      setProgress({
        currentIndex: 0,
        answers: {},
        correctCount: 0,
        totalQuestions: res.data.practiceSet.questionSequence?.length || 0,
      });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit answer for current question
  const submitAnswer = useCallback(async (questionId, answer, isCorrect) => {
    if (!currentSet) return;

    const updatedProgress = {
      ...progress,
      answers: {
        ...progress.answers,
        [questionId]: { answer, isCorrect, timestamp: new Date() },
      },
      correctCount: progress.correctCount + (isCorrect ? 1 : 0),
      currentIndex: progress.currentIndex + 1,
    };

    setProgress(updatedProgress);

    // Update results in backend
    const results = updatedProgress.answers;
    try {
      await updateResults(currentSet.id, results);
    } catch (err) {
      console.error('Failed to update results:', err);
    }

    // Check if completed
    const totalQuestions = currentSet.questionSequence?.length || 0;
    if (updatedProgress.currentIndex >= totalQuestions) {
      await completeSet(currentSet.id);
      // Load benefit after completion
      await loadBenefit();
    }

    return updatedProgress;
  }, [currentSet, progress, loadBenefit]);

  // Load confusable pairs
  const loadConfusablePairs = useCallback(async (topicIds) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getConfusablePairs(topicIds);
      setConfusablePairs(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a set
  const removeSet = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await deleteSet(id);
      await loadSets();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [loadSets]);

  // Load data on mount
  useEffect(() => {
    if (setId) {
      loadSet(setId);
    }
  }, [setId, loadSet]);

  return {
    // State
    loading,
    error,
    currentSet,
    sets,
    benefit,
    stats,
    confusablePairs,
    progress,

    // Actions
    loadSet,
    loadSets,
    loadStats,
    loadBenefit,
    createSet,
    submitAnswer,
    loadConfusablePairs,
    removeSet,

    // Computed
    isComplete: progress.currentIndex >= (currentSet?.questionSequence?.length || 0),
    hasSets: sets.length > 0,
    totalQuestions: currentSet?.questionSequence?.length || 0,
    completionPercentage: currentSet?.questionSequence?.length 
      ? (progress.currentIndex / currentSet.questionSequence.length) * 100
      : 0,
  };
};