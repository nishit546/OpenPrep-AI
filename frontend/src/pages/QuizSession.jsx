import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-icons/fa';

const REVIEW_FILTERS = [
  { key: 'all', label: 'All Questions' },
  { key: 'incorrect', label: 'Incorrect Only' },
  { key: 'bookmarked', label: 'Bookmarked' },
  { key: 'correct', label: 'Correct' },
];import API from '../services/api';
import MathRenderer from '../components/common/MathRenderer';
import { createQuizTelemetryQueue } from '../utils/quizTelemetry';
const SECONDS_PER_QUESTION = 60;

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const buildQuizResultRows = (quiz, answers) =>
  quiz.questions.map((q, idx) => ({
    questionNumber: idx + 1,
    question: q.questionText,
    yourAnswer: answers[q._id] ?? '',
    correctAnswer: q.correctAnswer,
    isCorrect: answers[q._id] === q.correctAnswer ? 'Yes' : 'No',
  }));

const QuizSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOption }
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const filterTabRefs = useRef([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submittingRef = useRef(false);

// Absolute deadline timestamp reference to prevent background tab timer throttling drift
  const endTimeRef = useRef(null);
  const autoSubmittedRef = useRef(false);

  // Client-side telemetry buffer: batches question timing/option-selection
  // events instead of sending an HTTP request per interaction.
  const telemetryRef = useRef(null);
  const questionEnteredAtRef = useRef(Date.now());
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

  const handleExportResultsPDF = () => {
    const element = document.getElementById('quiz-results-container');
    const opt = {
      margin: 0.5,
      filename: `quiz-result-${quiz.title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };

  useEffect(() => {
    fetchQuiz();
  }, [id]);

const fetchQuiz = async () => {
    try {
      const res = await API.get(`/quizzes/${id}`);
      const loadedQuiz = res.data.data;
      setQuiz(loadedQuiz);
      const totalSeconds = (loadedQuiz?.questions?.length || 0) * SECONDS_PER_QUESTION;
      setTimeLeft(totalSeconds);
      endTimeRef.current = Date.now() + totalSeconds * 1000;
      setLoading(false);

      telemetryRef.current = createQuizTelemetryQueue(id);
      telemetryRef.current.startAutoFlush();
      questionEnteredAtRef.current = Date.now();
    } catch (err) {
      setError('Failed to load quiz details.');
      setLoading(false);
    }
  };
const handleOptionSelect = (questionId, option) => {
    if (submitted || timeElapsed || submitting) return;
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: option,
    }));
    telemetryRef.current?.enqueue('option_select', {
      questionId,
      questionIndex: currentQuestionIndex,
      selectedOption: option,
    });
  };

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
const submitQuiz = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Format answers for API
      const formattedAnswers = Object.entries(answers).map(([qId, selected]) => ({
        questionId: qId,
        selectedAnswer: selected,
      }));

      telemetryRef.current?.enqueue('quiz_submit', { questionIndex: currentQuestionIndex });
      telemetryRef.current?.stopAutoFlush();
      telemetryRef.current?.flush();

      const res = await API.post(`/quizzes/${id}/submit`, { answers: formattedAnswers });
      setResult(res.data.data);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to submit quiz attempt. Check your connection and retry.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [answers, id, currentQuestionIndex]);
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
        setBookmarkedIds(new Set(res.data?.data || []));
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
  const timeElapsed = timeLeft === 0 && !submitted;
  const lowTime = timeLeft > 0 && timeLeft <= 30;

  const reviewCounts = { all: quiz.questions.length, correct: 0, incorrect: 0, bookmarked: 0 };
  quiz.questions.forEach((q) => {
    if (answers[q._id] === q.correctAnswer) reviewCounts.correct += 1;
    else reviewCounts.incorrect += 1;
    if (bookmarkedIds.has(q._id)) reviewCounts.bookmarked += 1;
  });

  const filteredQuestions = quiz.questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => {
      const isCorrect = answers[q._id] === q.correctAnswer;
      if (reviewFilter === 'incorrect') return !isCorrect;
      if (reviewFilter === 'correct') return isCorrect;
      if (reviewFilter === 'bookmarked') return bookmarkedIds.has(q._id);
      return true;
    });
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans py-10 px-4 md:px-20">
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
          <h1 className="text-2xl font-bold text-slate-100">{quiz.title}</h1>
          {!submitted && (
            <div className="flex items-center gap-3">
              <span
                role="timer"
                aria-label={`Time remaining: ${formatTime(timeLeft)}`}
                className={`text-sm font-semibold px-3 py-1 rounded-full font-mono ${
                  lowTime ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-indigo-300'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
              <span className="text-sm font-medium bg-slate-800 px-3 py-1 rounded-full text-indigo-300">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
            </div>
          )}
        </div>

        {/* Quiz Content */}
        {!submitted ? (
          <div className="bg-slate-800 rounded-xl p-6 md:p-8 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-6 leading-relaxed">
              <MathRenderer text={currentQuestion.questionText} />
            </h2>

            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion._id] === option;
                return (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(currentQuestion._id, option)}
                    disabled={submitted || timeElapsed || submitting}
                    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-center disabled:opacity-60 disabled:cursor-not-allowed ${
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
                    <span><MathRenderer text={option} /></span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || timeElapsed}
                className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <FaArrowLeft className="mr-2" /> Previous
              </button>

              {isLastQuestion ? (
                <button
                  onClick={() => submitQuiz()}
                  disabled={
                    submitting || timeElapsed || Object.keys(answers).length < quiz.questions.length
                  }
                  className="flex items-center px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Submit Quiz <FaCheckCircle className="ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={timeElapsed}
                  className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  Next <FaArrowRight className="ml-2" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Results View */
          <div id="quiz-results-container" className="bg-slate-800 rounded-xl p-8 shadow-xl border border-slate-700">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-full mb-4">
                <FaTrophy className="text-4xl text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2>
              <p className="text-slate-400 text-lg">
                You scored{' '}
                <span className="text-emerald-400 font-bold text-2xl">{result?.score}</span> out of{' '}
                {quiz.questions.length}
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
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
                  onClick={handleExportResultsPDF}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FaFilePdf /> Download PDF Summary
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
                const isCorrect = userAnswer === q.correctAnswer;
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

                        if (opt === q.correctAnswer) {
                          btnClass += 'bg-emerald-500/20 border-emerald-500 text-emerald-100';
                        } else if (opt === userAnswer && !isCorrect) {
                          btnClass += 'bg-red-500/20 border-red-500 text-red-100';
                        } else {
                          btnClass += 'bg-slate-800 border-slate-700 text-slate-400 opacity-75';
                        }

                        return (
                          <div key={oIdx} className={btnClass}>
                            <span><MathRenderer text={opt} /></span>
                            {opt === q.correctAnswer && <FaCheckCircle className="text-emerald-400" />}
                            {opt === userAnswer && !isCorrect && <FaTimesCircle className="text-red-400" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="bg-indigo-900/30 p-3 rounded border border-indigo-500/30">
                        <p className="text-sm text-indigo-200"><span className="font-semibold">Explanation:</span> <MathRenderer text={q.explanation} /></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
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
    </div>
  );
};

export default QuizSession;
