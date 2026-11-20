import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaArrowRight,
  FaTrophy,
  FaArrowLeft,
  FaBrain,
  FaFilePdf,
  FaBookmark,
  FaRegBookmark,
  FaSpinner,
} from 'react-icons/fa';
import API, { evaluateSubjectiveAnswer } from '../services/api';
import MathRenderer from '../components/common/MathRenderer';
import { exportAsCSV, exportAsJSON } from '../utils/exportUtils';
import useVoiceControl from '../hooks/useVoiceControl';
import VoiceModeToggle from '../components/VoiceModeToggle';
import AudioWaveform from '../components/AudioWaveform';
import BadgeUnlockModal from '../components/gamification/BadgeUnlockModal';
import LevelUpModal from '../components/gamification/LevelUpModal';
import RevisionSheetModal from '../components/dashboard/RevisionSheetModal';
import RemediationPlanModal from '../components/dashboard/RemediationPlanModal';
import QuestionExplanation from '../components/dashboard/QuestionExplanation';
import SubjectiveQuestionView from '../components/quiz/SubjectiveQuestionView';
import QuestionDiscussionThread from '../components/quiz/QuestionDiscussionThread';
import confetti from 'canvas-confetti';
import soundService from '../services/soundService';

export const getScoreMotivationalMessage = (score) => {
  const numScore = Number(score) || 0;
  if (numScore >= 90) return "Outstanding! 🏆 You've mastered this topic!";
  if (numScore >= 70) return "Great work! 🎯 Keep sharpening those edges.";
  return "Keep pushing! 💪 Review the weak topics below.";
};

export function useCountUp(targetValue, durationMs = 1500, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start || targetValue === undefined || targetValue === null) {
      setCount(0);
      return;
    }
    const end = Number(targetValue) || 0;
    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(easeOut * end));
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, durationMs, start]);

  return count;
}

const REVIEW_FILTERS = [
  { key: 'all', label: 'All Questions' },
  { key: 'incorrect', label: 'Incorrect Only' },
  { key: 'bookmarked', label: 'Bookmarked' },
  { key: 'correct', label: 'Correct' },
];
import { createQuizTelemetryQueue } from '../utils/quizTelemetry';
const SECONDS_PER_QUESTION = 60;

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const resolveUserAnswerIndex = (question, rawAnswer) => {
  if (rawAnswer === undefined || rawAnswer === null) return null;
  if (typeof rawAnswer === 'number') return rawAnswer;
  const idx = question.options.indexOf(rawAnswer);
  return idx === -1 ? null : idx;
};

const buildQuizResultRows = (quiz, answers) =>
  quiz.questions.map((q, idx) => {
    const isCorrect = Array.isArray(q.correctAnswer)
      ? q.correctAnswer.includes(answers[q._id])
      : answers[q._id] === q.correctAnswer;
    return {
      questionNumber: idx + 1,
      question: q.questionText,
      yourAnswer: answers[q._id] ?? '',
      correctAnswer: q.correctAnswer,
      isCorrect: isCorrect ? 'Yes' : 'No',
    };
  });

const QuizSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = useSelector((state) => state.auth.user?.role || 'student');

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeBadgeUnlock, setActiveBadgeUnlock] = useState(null);
  const [levelUpLevel, setLevelUpLevel] = useState(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOption }
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [reviewFilter, setReviewFilter] = useState('all');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isRemediationModalOpen, setIsRemediationModalOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [savedSessionBanner, setSavedSessionBanner] = useState(null);
  
  const animatedScore = useCountUp(result?.score ?? 0, 1500, submitted);
  const startedAtRef = useRef(Date.now());

  const submittingRef = useRef(false);
  // Unique idempotency key for this session's submission — reused across retries
  // so the backend can drop duplicate submissions (#762).
  const submissionIdRef = useRef(null);
  const getSubmissionId = () => {
    if (!submissionIdRef.current) {
      // Always a real v4 UUID: crypto.randomUUID (secure contexts), with a
      // spec-compliant fallback for non-secure contexts (e.g. http:// over LAN)
      // so the backend's uuid() validation never rejects the idempotency key.
      const uuidv4 = () => {
        // Degrade gracefully if crypto is entirely unavailable (ancient
        // browsers) — the format stays spec-compliant v4 either way so the
        // backend's uuid() validation never rejects the idempotency key.
        const hasCrypto =
          typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
        const bytes = hasCrypto
          ? crypto.getRandomValues(new Uint8Array(16))
          : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      };
      submissionIdRef.current =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : uuidv4();
    }
    return submissionIdRef.current;
  };

// Absolute deadline timestamp reference to prevent background tab timer throttling drift
  const endTimeRef = useRef(null);
  const autoSubmittedRef = useRef(false);
  // Roving-tabindex refs for the review filter tabs (was an undeclared reference on main)
  const filterTabRefs = useRef([]);

  // Client-side telemetry buffer: batches question timing/option-selection
  // events instead of sending an HTTP request per interaction.
  const telemetryRef = useRef(null);
  const questionEnteredAtRef = useRef(0);
  const handleExportResultsCSV = () => {
    const rows = buildQuizResultRows(quiz, answers);
    exportAsCSV(
      rows,
      ['questionNumber', 'question', 'yourAnswer', 'correctAnswer', 'isCorrect'],
      `quiz-result-${quiz.title}`
    );
  };

  const handleExportResultsJSON = () => {
    exportAsJSON(
      {
        quizTitle: quiz.title,
        score: result?.score,
        totalQuestions: quiz.questions.length,
        completedAt: new Date().toISOString(),
        answers: buildQuizResultRows(quiz, answers),
      },
      `quiz-result-${quiz.title}`
    );
  };

  const handleDownloadPDFReport = async () => {
    try {
      const response = await API.get(`/quizzes/attempts/${result.id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quiz-report-${result.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF report:', err);
      alert('Failed to generate and download PDF report. Please try again.');
    }
  };

  const [adaptiveInfo, setAdaptiveInfo] = useState(null);

  const fetchNextAdaptiveQuestion = useCallback(async () => {
    try {
      const res = await API.get('/quiz/next');
      const data = res.data;
      if (data?.success && data?.question) {
        setAdaptiveInfo({
          difficulty: data.difficulty,
          skillScore: data.skillScore,
        });
        const dynamicQuiz = {
          id: 'adaptive',
          title: `Adaptive Quiz (${data.difficulty} Level - Rating ${Math.round(data.skillScore || 1000)})`,
          timeLimit: 15,
          questions: [data.question],
        };
        setQuiz(dynamicQuiz);
        const totalSeconds = 15 * SECONDS_PER_QUESTION;
        setTimeLeft(totalSeconds);
        endTimeRef.current = Date.now() + totalSeconds * 1000;
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch adaptive question:', err);
    }
  }, []);

  const fetchQuiz = useCallback(async () => {
    try {
      if (id === 'adaptive' || id === 'next') {
        await fetchNextAdaptiveQuestion();
        return;
      }

      const res = await API.get(`/quizzes/${id}`);
      const loadedQuiz = res.data.data;
      setQuiz(loadedQuiz);
      const totalSeconds = loadedQuiz?.timeLimit
        ? loadedQuiz.timeLimit * 60
        : (loadedQuiz?.questions?.length || 0) * SECONDS_PER_QUESTION;
      setTimeLeft(totalSeconds);
      endTimeRef.current = Date.now() + totalSeconds * 1000;
      setLoading(false);

      telemetryRef.current = createQuizTelemetryQueue(id);
      telemetryRef.current.startAutoFlush();
      questionEnteredAtRef.current = Date.now();
    } catch (err) {
      console.error(err);
      setError('Failed to load quiz details.');
      setLoading(false);
    }
  }, [id, fetchNextAdaptiveQuestion]);

  useEffect(() => {
    fetchQuiz();
  }, [id, fetchQuiz]);

  // Check localStorage for saved session on quiz load
  useEffect(() => {
    if (!id || !quiz) return;
    const storageKey = `quiz_progress_${id}`;
    try {
      const savedStr = localStorage.getItem(storageKey);
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        if (parsed && parsed.startedAt && Date.now() - parsed.startedAt < TWO_HOURS_MS) {
          setSavedSessionBanner(parsed);
        } else {
          // Expired (older than 2 hours) -> automatically discard
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved quiz progress:', e);
    }
  }, [id, quiz]);

  // Auto-save quiz progress to localStorage (debounced by 500ms)
  useEffect(() => {
    if (!id || !quiz || submitted) return;
    if (Object.keys(answers).length === 0 && currentQuestionIndex === 0) return;

    const timer = setTimeout(() => {
      try {
        const storageKey = `quiz_progress_${id}`;
        const dataToSave = {
          quizId: id,
          answers,
          currentQuestionIndex,
          startedAt: startedAtRef.current || Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch (e) {
        console.error('Failed to save quiz progress to localStorage:', e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [id, quiz, answers, currentQuestionIndex, submitted]);

  useEffect(() => {
    if (submitted && result?.score !== undefined && result.score >= 70) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [submitted, result?.score]);

  const handleResumeQuiz = () => {
    if (savedSessionBanner) {
      if (savedSessionBanner.answers) {
        setAnswers(savedSessionBanner.answers);
      }
      if (savedSessionBanner.startedAt) {
        startedAtRef.current = savedSessionBanner.startedAt;
      }
      let targetIndex = savedSessionBanner.currentQuestionIndex ?? 0;
      if (quiz && quiz.questions) {
        const restoredAnswers = savedSessionBanner.answers || {};
        const firstUnanswered = quiz.questions.findIndex((q) => !restoredAnswers[q._id || q.id]);
        if (firstUnanswered !== -1) {
          targetIndex = firstUnanswered;
        }
      }
      setCurrentQuestionIndex(targetIndex);
    }
    setSavedSessionBanner(null);
  };

  const handleDiscardSavedQuiz = () => {
    if (id) {
      localStorage.removeItem(`quiz_progress_${id}`);
    }
    setSavedSessionBanner(null);
  };

  const timeElapsed = timeLeft === 0 && !submitted;

const handleOptionSelect = useCallback((questionId, option) => {
    if (submitted || timeElapsed || submitting) return;
    soundService.playFlipSound();
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: option,
    }));
    telemetryRef.current?.enqueue('option_select', {
      questionId,
      questionIndex: currentQuestionIndex,
      selectedOption: option,
    });
  }, [submitted, timeElapsed, submitting, currentQuestionIndex]);

  const recordQuestionView = () => {
    telemetryRef.current?.enqueue('question_view', {
      questionId: quiz.questions[currentQuestionIndex]?._id,
      questionIndex: currentQuestionIndex,
      timeSpentMs: Date.now() - questionEnteredAtRef.current,
    });
    questionEnteredAtRef.current = Date.now();
  };

  const handleNext = () => {
    if (timeElapsed) return;
    if (currentQuestionIndex < quiz.questions.length - 1) {
      recordQuestionView();
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (timeElapsed) return;
    if (currentQuestionIndex > 0) {
      recordQuestionView();
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleVoiceCommand = useCallback((command) => {
    const q = quiz?.questions?.[currentQuestionIndex];
    if (!q) return;
    let optionIndex = -1;
    if (command === 'OPTION_0') optionIndex = 0;
    else if (command === 'OPTION_1') optionIndex = 1;
    else if (command === 'OPTION_2') optionIndex = 2;
    else if (command === 'OPTION_3') optionIndex = 3;

    if (optionIndex !== -1 && q.options[optionIndex]) {
      handleOptionSelect(q._id, q.options[optionIndex]);
    }
  }, [quiz, currentQuestionIndex, handleOptionSelect]);

  const {
    isSupported,
    isEnabled,
    isPaused,
    status,
    errorMsg,
    toggleVoiceMode,
    speak,
    cancelSpeech
  } = useVoiceControl({
    onCommand: handleVoiceCommand,
  });

  useEffect(() => {
    cancelSpeech();
    const q = quiz?.questions?.[currentQuestionIndex];
    if (isEnabled && !isPaused && !submitted && q) {
      const optionLabels = ['A', 'B', 'C', 'D'];
      let text = q.questionText + '. ';
      q.options.forEach((opt, idx) => {
        if (idx < 4) text += `Option ${optionLabels[idx]}: ${opt}. `;
      });
      speak(text);
    }
  }, [quiz, currentQuestionIndex, isEnabled, isPaused, submitted, speak, cancelSpeech]);

const submitQuiz = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const unevaluatedQuestion = quiz?.questions?.find((question) => {
        const isSubjective = question.questionType === 'SUBJECTIVE' || (!question.options && question.idealAnswer);
        return isSubjective && !answers[question._id || question.id]?.evaluationReceipt;
      });
      if (unevaluatedQuestion && !timeElapsed) {
        setSubmitError('Evaluate every subjective answer before submitting the quiz.');
        return;
      }
      // Format answers for API
      const formattedAnswers = Object.entries(answers).map(([qId, selected]) => ({
        questionId: qId,
        selectedAnswer: selected,
      }));

      telemetryRef.current?.enqueue('quiz_submit', { questionIndex: currentQuestionIndex });
      telemetryRef.current?.stopAutoFlush();
      telemetryRef.current?.flush();

      const timezoneOffset = new Date().getTimezoneOffset();
      const res = await API.post(`/quizzes/${id}/submit`, {
        answers: formattedAnswers,
        submissionId: getSubmissionId(),
      }, {
        headers: { 'x-timezone-offset': String(timezoneOffset) }
      });
      
      if (res.data?.progression?.newBadges?.length > 0) {
        setActiveBadgeUnlock(res.data.progression.newBadges[0]);
      }
      if (res.data?.progression?.leveledUp) {
        setLevelUpLevel(res.data.progression.level);
        setShowLevelUpModal(true);
      }

      setResult(res.data.data);
      setSubmitted(true);
      const score = res.data?.data?.score ?? 0;
      if (score >= 80) {
        soundService.playStreakFanfare();
      } else {
        soundService.playSuccessChime();
      }
      if (id) {
        localStorage.removeItem(`quiz_progress_${id}`);
      }
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.error || 'Failed to submit quiz attempt. Check your connection and retry.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [answers, id, currentQuestionIndex, quiz, timeElapsed]);
  // Countdown using absolute timestamps and visibilitychange recalibration to fix tab-switching throttling (#518)
  useEffect(() => {
    if (!quiz || submitted || !endTimeRef.current) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    };

    const interval = setInterval(updateTimer, 250);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quiz, submitted]);

// When the countdown reaches zero, freeze input and submit automatically.
  useEffect(() => {
    if (!quiz || submitted || timeLeft !== 0) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    submitQuiz();
  }, [quiz, submitted, timeLeft, submitQuiz]);

  // Load previously saved bookmarks once results are shown, so Review Mode
  // reflects bookmarks made in earlier visits to this quiz's results.
  useEffect(() => {
    if (!submitted) return;
    const loadBookmarks = async () => {
      try {
        const res = await API.get(`/quizzes/${id}/bookmarks`);
        setBookmarkedIds(new Set(Array.isArray(res.data?.data) ? res.data.data : []));
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    };
    loadBookmarks();
  }, [submitted, id]);

  const handleToggleBookmark = async (questionId) => {
    const wasBookmarked = bookmarkedIds.has(questionId);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      wasBookmarked ? next.delete(questionId) : next.add(questionId);
      return next;
    });
    try {
      await API.post(`/quizzes/${id}/bookmarks/toggle`, { questionId });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        wasBookmarked ? next.add(questionId) : next.delete(questionId);
        return next;
      });
    }
  };

  // Roving-tabindex arrow-key navigation across the review filter tabs
  const handleFilterKeyDown = (event, index) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + REVIEW_FILTERS.length) % REVIEW_FILTERS.length;
    setReviewFilter(REVIEW_FILTERS[nextIndex].key);
    filterTabRefs.current[nextIndex]?.focus();
  };
  // Reliably flush buffered telemetry on tab close / navigation using
  // navigator.sendBeacon (fires-and-forgets even as the page unloads),
  // plus a best-effort flush on unmount.
  useEffect(() => {
    const flushOnExit = () => {
      telemetryRef.current?.flush({ useBeacon: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushOnExit();
      }
    };

    window.addEventListener('beforeunload', flushOnExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushOnExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      telemetryRef.current?.stopAutoFlush();
      telemetryRef.current?.flush();
    };
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error || 'Quiz not found.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Empty quiz guard: a quiz with zero questions (e.g. a filter returning no
  // matches) must not render a question, enable submission, or compute a
  // percentage. Show a friendly empty-state notice instead.
  if (quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
        <FaTimesCircle className="text-4xl text-amber-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Questions Available</h2>
        <p className="text-slate-300 mb-6">
          This quiz has no questions to answer. Try adjusting your filters or generating a new quiz.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  
  const lowTime = timeLeft > 0 && timeLeft <= 30;

  const reviewCounts = { all: quiz.questions.length, correct: 0, incorrect: 0, bookmarked: 0 };
  quiz.questions.forEach((q) => {
    const isCorrect = Array.isArray(q.correctAnswer)
      ? q.correctAnswer.includes(answers[q._id])
      : answers[q._id] === q.correctAnswer;
    if (isCorrect) reviewCounts.correct += 1;
    else reviewCounts.incorrect += 1;
    if (bookmarkedIds.has(q._id)) reviewCounts.bookmarked += 1;
  });

  const filteredQuestions = quiz.questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => {
      const isCorrect = Array.isArray(q.correctAnswer)
        ? q.correctAnswer.includes(answers[q._id])
        : answers[q._id] === q.correctAnswer;
      if (reviewFilter === 'incorrect') return !isCorrect;
      if (reviewFilter === 'correct') return isCorrect;
      if (reviewFilter === 'bookmarked') return bookmarkedIds.has(q._id);
      return true;
    });

  const motivationalMessage = getScoreMotivationalMessage(result?.score ?? 0);
  return (
    <div className="min-h-screen bg-slate-900 text-white py-6 sm:py-10 px-3 sm:px-6 md:px-20">
      {timeElapsed && !submitted && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-6"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Time Elapsed</h2>
              <p className="text-slate-300">Submitting Quiz...</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Time Elapsed</h2>
              <p className="text-slate-300 mb-6">
                {submitError || 'Your answers were frozen when the time ran out.'}
              </p>
              <button
                onClick={() => submitQuiz()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors"
              >
                Retry Submission
              </button>
            </>
          )}
        </div>
      )}

      {savedSessionBanner && !submitted && (
        <div
          role="alert"
          aria-label="Resume quiz banner"
          className="max-w-3xl mx-auto mb-6 bg-amber-500/20 border border-amber-500/40 text-amber-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">⏳</span>
            <div>
              <h4 className="font-bold text-white text-base">Resume quiz?</h4>
              <p className="text-xs text-amber-200/80">
                You have saved progress for this quiz from {new Date(savedSessionBanner.startedAt).toLocaleTimeString()}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleResumeQuiz}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow"
            >
              Resume
            </button>
            <button
              onClick={handleDiscardSavedQuiz}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-lg transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Accessible Screen Reader Live Announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {submitted
            ? `Quiz completed. Final score: ${result?.score ?? 0} percent.`
            : `Question ${currentQuestionIndex + 1} of ${quiz.questions.length}. Time remaining: ${formatTime(timeLeft)}.`}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{quiz.title}</h1>
            {adaptiveInfo && (
              <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <FaBrain className="w-3 h-3" /> Adaptive Tier: {adaptiveInfo.difficulty} ({Math.round(adaptiveInfo.skillScore || 1000)})
              </span>
            )}
          </div>
          {!submitted && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <AudioWaveform status={status} />
              <VoiceModeToggle
                isSupported={isSupported}
                isEnabled={isEnabled}
                isPaused={isPaused}
                toggleVoiceMode={toggleVoiceMode}
                errorMsg={errorMsg}
                status={status}
              />
              <span
                role="timer"
                aria-label={`Time remaining: ${formatTime(timeLeft)}`}
                className={`text-xs sm:text-sm font-semibold px-3 py-1 rounded-full font-mono ${
                  lowTime ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-indigo-300'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs sm:text-sm font-medium bg-slate-800 px-3 py-1 rounded-full text-indigo-300">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
            </div>
          )}
        </div>

        {/* Quiz Content */}
        {!submitted ? (
          <>
          {currentQuestion.questionType === 'SUBJECTIVE' || (!currentQuestion.options && currentQuestion.idealAnswer) ? (
            <SubjectiveQuestionView
              key={currentQuestion._id || currentQuestion.id}
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={quiz.questions.length}
              existingAnswer={typeof answers[currentQuestion._id || currentQuestion.id] === 'object' ? answers[currentQuestion._id || currentQuestion.id]?.userAnswerText || '' : (answers[currentQuestion._id || currentQuestion.id] || '')}
              existingEvaluation={typeof answers[currentQuestion._id || currentQuestion.id] === 'object' ? answers[currentQuestion._id || currentQuestion.id]?.evaluation || null : null}
              onAnswerChange={(qId, userAnswerText) => {
                setAnswers((prev) => ({
                  ...prev,
                  [qId]: { questionType: 'SUBJECTIVE', userAnswerText },
                }));
              }}
              onEvaluateAnswer={async (qId, userAnswerText) => {
                const response = await evaluateSubjectiveAnswer({
                  questionId: qId,
                  quizId: quiz.id,
                  userAnswerText,
                });
                const evalData = response.data.data;
                setAnswers((prev) => ({
                  ...prev,
                  [qId]: {
                    questionId: qId,
                    questionType: 'SUBJECTIVE',
                    userAnswerText,
                    evaluation: evalData,
                    evaluationReceipt: evalData.receipt,
                  },
                }));
                return evalData;
              }}
            />
          ) : (
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8 shadow-xl border border-slate-700">
            <h2 className="text-lg sm:text-xl font-semibold mb-6 leading-relaxed break-words whitespace-pre-wrap">
              <MathRenderer text={currentQuestion.questionText} />
            </h2>

            <button 
              onClick={() => alert("Socratic Hint: Remember the core principles and try eliminating options that don't fit the pattern.")}
              className="mb-4 text-sm text-indigo-400 hover:text-indigo-300 underline"
            >
              Get a Hint
            </button>

            <div className="space-y-3 mb-8">
              {(currentQuestion.options || []).map((option, index) => {
                const isSelected = answers[currentQuestion._id] === option;
                return (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(currentQuestion._id, option)}
                    disabled={submitted || timeElapsed || submitting}
                    className={`w-full min-w-0 text-left p-3.5 sm:p-4 rounded-lg border transition-all duration-200 flex items-center min-h-[44px] break-words disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100'
                        : 'bg-slate-700/50 border-slate-600 hover:border-indigo-400 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex-shrink-0 mr-4 flex items-center justify-center ${isSelected ? 'border-indigo-400' : 'border-slate-400'}`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>}
                    </div>
                    <span>
                      <MathRenderer text={option} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          <QuestionDiscussionThread
            questionId={currentQuestion._id || currentQuestion.id}
            userRole={userRole}
          />

          {/* Global Quiz Question Navigation Bar */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || timeElapsed}
              className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-slate-200"
            >
              <FaArrowLeft className="mr-2" /> Previous
            </button>

            {isLastQuestion ? (
              <button
                onClick={() => submitQuiz()}
                disabled={submitting || timeElapsed}
                className="flex items-center px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold shadow-lg shadow-emerald-500/20 transition-all text-white"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="ml-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Quiz <FaCheckCircle className="ml-2" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={timeElapsed}
                className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-white"
              >
                Next <FaArrowRight className="ml-2" />
              </button>
            )}
          </div>
          </>
        ) : (
          /* Results View */
          <div
            id="quiz-results-container"
            className="bg-slate-800 rounded-xl p-8 shadow-xl border border-slate-700"
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-full mb-4">
                <FaTrophy className="text-4xl text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2>
              <p className="text-slate-400 text-lg">
                You scored{' '}
                <span className="text-emerald-400 font-bold text-3xl font-mono" data-testid="animated-score">
                  {animatedScore}%
                </span>
              </p>
              <p className="mt-3 text-lg font-semibold text-emerald-300 animate-fade-in" data-testid="motivational-message">
                {motivationalMessage}
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={handleExportResultsCSV}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  Export as CSV
                </button>
                <button
                  onClick={handleExportResultsJSON}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  Export as JSON
                </button>
                 <button
                   onClick={handleDownloadPDFReport}
                   className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                 >
                   <FaFilePdf /> Download PDF Report
                 </button>
              </div>
            </div>
<div className="space-y-6">
              <h3 className="text-xl font-semibold border-b border-slate-700 pb-2 mb-4">
                Review Answers
              </h3>

              <div role="tablist" aria-label="Filter review questions" className="flex flex-wrap gap-2 mb-6">
                {REVIEW_FILTERS.map((f, i) => (
                  <button
                    key={f.key}
                    role="tab"
                    id={`review-tab-${f.key}`}
                    aria-selected={reviewFilter === f.key}
                    aria-controls="quiz-review-list"
                    tabIndex={reviewFilter === f.key ? 0 : -1}
                    ref={(el) => (filterTabRefs.current[i] = el)}
                    onClick={() => setReviewFilter(f.key)}
                    onKeyDown={(e) => handleFilterKeyDown(e, i)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      reviewFilter === f.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {f.label} <span className="ml-1 text-xs opacity-75">({reviewCounts[f.key]})</span>
                  </button>
                ))}
              </div>

              {filteredQuestions.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-6">
                  No questions match this filter.
                </p>
              )}

              {filteredQuestions.map(({ q, idx }) => {
                const userAnswer = answers[q._id];
                const isCorrect = Array.isArray(q.correctAnswer)
                  ? q.correctAnswer.includes(userAnswer)
                  : userAnswer === q.correctAnswer;
                const isBookmarked = bookmarkedIds.has(q._id);

                return (
                  <div key={q._id} id="quiz-review-list" className="p-5 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-medium text-slate-200"><span className="text-slate-400 mr-2">{idx + 1}.</span><MathRenderer text={q.questionText} /></p>
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(q._id)}
                        aria-pressed={isBookmarked}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
                        className="flex-shrink-0 text-lg text-amber-400 hover:text-amber-300"
                      >
                        {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
                      </button>
                    </div>                    
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, oIdx) => {
                        let btnClass =
                          'w-full text-left p-3 rounded-md border text-sm flex items-center justify-between ';

                        const isOptCorrect = Array.isArray(q.correctAnswer)
                          ? (q.correctAnswer.includes(opt) || q.correctAnswer.includes(oIdx))
                          : (opt === q.correctAnswer || oIdx === q.correctAnswer);

                        if (isOptCorrect) {
                          btnClass += 'bg-emerald-500/20 border-emerald-500 text-emerald-100';
                        } else if (opt === userAnswer && !isCorrect) {
                          btnClass += 'bg-red-500/20 border-red-500 text-red-100';
                        } else {
                          btnClass += 'bg-slate-800 border-slate-700 text-slate-400 opacity-75';
                        }

                        return (
                          <div key={oIdx} className={btnClass}>
                            <span>
                              <MathRenderer text={opt} />
                            </span>
                            {isOptCorrect && (
                              <FaCheckCircle className="text-emerald-400" />
                            )}
                            {opt === userAnswer && !isCorrect && (
                              <FaTimesCircle className="text-red-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="bg-indigo-900/30 p-3 rounded border border-indigo-500/30">
                        <p className="text-sm text-indigo-200">
                          <span className="font-semibold">Explanation:</span>{' '}
                          <MathRenderer text={q.explanation} />
                        </p>
                      </div>
                    )}

                    <QuestionExplanation
                      question={q.questionText}
                      options={q.options}
                      correctAnswer={q.correctAnswer}
                      userAnswer={resolveUserAnswerIndex(q, userAnswer)}
                      explanation={q.explanation || ''}
                      subjectName={quiz.subject?.name || ''}
                      topicName={quiz.topic?.name || ''}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              {result?.score < 80 && (
                <button
                  onClick={() => setIsRemediationModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg font-semibold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <FaBrain className="text-yellow-200" /> Generate 3-Day Remediation Plan
                </button>
              )}

              <button
                onClick={() => setIsRevisionModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <FaBrain className="text-yellow-300" /> Generate AI Concept Revision Sheet
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
              >
                Back to Dashboard
              </button>
            </div>

            <RemediationPlanModal
              isOpen={isRemediationModalOpen}
              onClose={() => setIsRemediationModalOpen(false)}
              quizAttemptId={result?.id || result?._id}
              subjectId={quiz.subject?.id || quiz.subject}
              topicId={quiz.topic?.id || quiz.topic}
              topicName={quiz.topic?.name}
            />

            <RevisionSheetModal
              isOpen={isRevisionModalOpen}
              onClose={() => setIsRevisionModalOpen(false)}
              quizAttemptId={result?.id || result?._id}
              subjectId={quiz.subject?.id || quiz.subject}
              topicId={quiz.topic?.id || quiz.topic}
              topicName={quiz.topic?.name}
            />
          </div>
        )}
      </div>

      {/* --- GAMIFICATION CELEBRATION MODALS --- */}
      <BadgeUnlockModal
        isOpen={!!activeBadgeUnlock}
        title={activeBadgeUnlock?.title}
        description={activeBadgeUnlock?.description}
        onClose={() => setActiveBadgeUnlock(null)}
      />

      <LevelUpModal
        level={levelUpLevel}
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
      />
    </div>
  );
};

export default QuizSession;
