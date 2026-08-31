/**
 * @fileoverview Full-Screen Mock Exam Simulator with Sectional Timers, Question Palette, and Auto-Save Recovery.
 */
import React, { useState, useEffect, useRef } from 'react';
import SectionalTimer from './SectionalTimer';
import { saveExamState, getExamState, clearExamState } from '../../utils/examIndexedDBSync';
import axios from 'axios';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Mock questions list for simulation
const MOCK_QUESTIONS = [
  { id: 'p1', section: 'physics', text: 'Evaluate the gravitational force vector: \\vec{F} = G \\frac{m_1 m_2}{r^2} \\hat{r}', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'A' },
  { id: 'p2', section: 'physics', text: 'Determine work done: W = \\int \\vec{F} \\cdot d\\vec{r}', options: ['10 J', '20 J', '30 J', '40 J'], answer: 'B' },
  { id: 'c1', section: 'chemistry', text: 'What is the molecular formula of benzene?', options: ['C6H6', 'C6H12', 'CH4', 'C2H2'], answer: 'A' },
  { id: 'c2', section: 'chemistry', text: 'State the ideal gas law formula.', options: ['PV = nRT', 'P = V/T', 'F = ma', 'E = mc^2'], answer: 'A' },
  { id: 'm1', section: 'mathematics', text: 'Solve the integral: \\int_{0}^{\\pi} \\sin(x) dx', options: ['0', '1', '2', 'pi'], answer: 'C' },
  { id: 'm2', section: 'mathematics', text: 'Solve the derivative: \\frac{d}{dx}[e^{2x}]', options: ['e^{2x}', '2e^{2x}', 'e^x', '2x e^{2x-1}'], answer: 'B' },
];

const SECTIONS = ['physics', 'chemistry', 'mathematics'];
const SECTION_DURATIONS = { physics: 60, chemistry: 60, mathematics: 60 }; // 60 minutes each

const MockExamArena = ({ examId = 'exam_test_123' }) => {
  const containerRef = useRef(null);

  // Session & Local Storage state
  const [sessionId, setSessionId] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Answers mapping: questionId -> { selectedOption, status }
  // statuses: 'answered', 'marked', 'answered-marked', 'not-answered', 'unvisited'
  const [answers, setAnswers] = useState({});
  const [elapsedTimeLeft, setElapsedTimeLeft] = useState(null); // per section seconds left
  const [violationsCount, setViolationsCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showScorecard, setShowScorecard] = useState(null); // scorecard data
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSection = SECTIONS[activeSectionIndex];
  const sectionQuestions = MOCK_QUESTIONS.filter((q) => q.section === activeSection);
  const currentQuestion = sectionQuestions[currentQuestionIndex];

  // Initialize Exam Session (check IndexedDB first, else call backend to start)
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Try to recover state from IndexedDB
        const localSession = await getExamState(examId);
        if (localSession) {
          setSessionId(localSession.sessionId);
          setAnswers(localSession.answers || {});
          setViolationsCount(localSession.violationsCount || 0);
          setActiveSectionIndex(localSession.activeSectionIndex || 0);
          setCurrentQuestionIndex(localSession.currentQuestionIndex || 0);
          setElapsedTimeLeft(localSession.elapsedTimeLeft);
          return;
        }

        // Else start a fresh session on backend
        const res = await axios.post(`/api/mock-exams/${examId}/start`, {}, { headers });
        if (res.data && res.data.success) {
          setSessionId(res.data.data.id);
          // Mark all questions as unvisited initially
          const initialAnswers = {};
          MOCK_QUESTIONS.forEach((q) => {
            initialAnswers[q.id] = { selectedOption: null, status: 'unvisited' };
          });
          setAnswers(initialAnswers);
          setElapsedTimeLeft(SECTION_DURATIONS[SECTIONS[0]] * 60);
        }
      } catch (err) {
        console.error('Failed to initialize mock exam session:', err);
      }
    };
    initializeSession();
  }, [examId]);

  // IndexedDB auto-save recovery hook: runs every 5 seconds
  useEffect(() => {
    if (!sessionId || showScorecard) return;

    const autoSaveInterval = setInterval(() => {
      saveExamState(examId, {
        sessionId,
        answers,
        violationsCount,
        activeSectionIndex,
        currentQuestionIndex,
        elapsedTimeLeft,
      });
    }, 5000);

    return () => clearInterval(autoSaveInterval);
  }, [sessionId, answers, violationsCount, activeSectionIndex, currentQuestionIndex, elapsedTimeLeft, examId, showScorecard]);

  // Periodic Heartbeat synchronization to backend every 15 seconds
  useEffect(() => {
    if (!sessionId || showScorecard) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.post(`/api/mock-exams/${sessionId}/heartbeat`, {
          answers,
          violationsCount,
        }, { headers });
      } catch (err) {
        console.error('Heartbeat sync failed:', err);
      }
    }, 15000);

    return () => clearInterval(heartbeatInterval);
  }, [sessionId, answers, violationsCount, showScorecard]);

  // Handle network reconnection to resync timer
  useEffect(() => {
    const handleOnline = async () => {
      if (!sessionId || showScorecard) return;
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // Sync with backend to get the authoritative remaining time
        const res = await axios.get(`/api/mock-exams/${sessionId}/sync`, { headers });
        if (res.data && res.data.success && res.data.data.elapsedTimeLeft !== undefined) {
          setElapsedTimeLeft(res.data.data.elapsedTimeLeft);
        }
      } catch (err) {
        console.error('Failed to resync timer after reconnection:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sessionId, showScorecard]);

  // Monitor Window focus/blur and Full-Screen lock breaches
  useEffect(() => {
    if (showScorecard) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleBlur = () => {
      handleViolation();
    };

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && sessionId) {
        handleViolation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [sessionId, violationsCount, showScorecard]);

  const handleViolation = () => {
    setViolationsCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        // Auto submit on exceeding violation counts limit
        triggerSubmit(true);
      } else {
        setShowWarningModal(true);
      }
      return next;
    });
  };

  // Lock browser into Full-Screen Mode
  const enterFullscreen = async () => {
    try {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Failed to enter fullscreen mode:', err);
    }
  };

  const handleSelectOption = (option) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const current = next[currentQuestion.id] || {};
      next[currentQuestion.id] = {
        ...current,
        selectedOption: option,
        status: current.status === 'marked' || current.status === 'answered-marked' ? 'answered-marked' : 'answered',
      };
      return next;
    });
  };

  const handleMarkForReview = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      const current = next[currentQuestion.id] || {};
      const hasAns = current.selectedOption !== null;
      next[currentQuestion.id] = {
        ...current,
        status: hasAns ? 'answered-marked' : 'marked',
      };
      return next;
    });
  };

  const handleClearResponse = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      next[currentQuestion.id] = {
        selectedOption: null,
        status: 'not-answered',
      };
      return next;
    });
  };

  const handleNext = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      const current = next[currentQuestion.id] || {};
      // If user hasn't chosen anything and status was unvisited, set to not-answered
      if (current.status === 'unvisited') {
        next[currentQuestion.id] = { ...current, status: 'not-answered' };
      }
      return next;
    });

    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Section expiry transition
  const handleSectionExpired = () => {
    if (activeSectionIndex < SECTIONS.length - 1) {
      setActiveSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
      setElapsedTimeLeft(SECTION_DURATIONS[SECTIONS[activeSectionIndex + 1]] * 60);
    } else {
      triggerSubmit(false);
    }
  };

  // Grade Mock Exam Submission
  const triggerSubmit = async (forced = false) => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`/api/mock-exams/${sessionId}/submit`, {
        answers,
        violationsCount: forced ? 3 : violationsCount,
      }, { headers });

      if (res.data && res.data.success) {
        setShowScorecard(res.data.data);
        clearExamState(examId);
        // Exit full screen if active
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Utility to render math
  const renderMath = (text) => {
    try {
      // Split by LaTeX delimiters and render
      const parts = text.split(/(\\vec\{F\} = G \\frac\{m_1 m_2\}\{r\^2\} \\hat\{r\}|\\int \\vec\{F\} \\cdot d\\vec\{r\}|\\int_\{0\}\^\{\\pi\} \\sin\(x\) dx|\\frac\{d\}\{dx\}\[e\^\{2x\}\])/);
      return parts.map((part, index) => {
        if (part.startsWith('\\')) {
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(part, { displayMode: true, throwOnError: false }),
              }}
            />
          );
        }
        return <span key={index}>{part}</span>;
      });
    } catch (err) {
      return <span>{text}</span>;
    }
  };

  if (showScorecard) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-6">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Mock Attempt Scorecard</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Exam details, scores, and percentile aggregations</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Final Score</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{showScorecard.score.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Percentile</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{showScorecard.percentile.toFixed(1)}th</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Violations</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{showScorecard.violationsCount}</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-left mb-8">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Sectional Analysis</h3>
            <div className="space-y-4">
              {Object.entries(showScorecard.sectionPercentiles).map(([sec, val]) => (
                <div key={sec} className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize text-slate-600 dark:text-slate-400">{sec}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${val}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{val.toFixed(1)}th %ile</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-inter">
      {/* Header Bar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Exam Simulator</h1>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold capitalize text-slate-600 dark:text-slate-300">
            Section: {activeSection}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {elapsedTimeLeft !== null && (
            <SectionalTimer
              durationMinutes={SECTION_DURATIONS[activeSection]}
              activeSection={activeSection}
              onSectionExpired={handleSectionExpired}
              onTimeUpdate={setElapsedTimeLeft}
              initialTimeLeft={elapsedTimeLeft}
            />
          )}

          <button
            onClick={() => triggerSubmit(false)}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm shadow-md shadow-indigo-500/10"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main split work layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fullscreen Guard Banner Overlay */}
        {!isFullscreen && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
            <h3 className="text-2xl font-black text-white mb-2">FULL SCREEN ENFORCEMENT ACTIVE</h3>
            <p className="text-slate-400 mb-6 max-w-md">You are attempting a proctored exam. Leaving full-screen mode or switching tabs generates a testing violation.</p>
            <button
              onClick={enterFullscreen}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
            >
              Enter Fullscreen & Resume
            </button>
          </div>
        )}

        {/* Left Side: Question Display */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-between">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-sm min-h-[400px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {currentQuestionIndex + 1}</span>
            <div className="text-slate-800 dark:text-slate-100 text-lg leading-relaxed mt-4 mb-8">
              {currentQuestion && renderMath(currentQuestion.text)}
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion && currentQuestion.options.map((opt, index) => {
                const optCode = String.fromCharCode(65 + index); // 'A', 'B', 'C', 'D'
                const isSelected = answers[currentQuestion.id]?.selectedOption === optCode;

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(optCode)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-900 dark:text-indigo-300 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {optCode}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-semibold transition-all"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentQuestionIndex === sectionQuestions.length - 1}
                className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-semibold transition-all"
              >
                Next
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClearResponse}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-semibold"
              >
                Clear Response
              </button>
              <button
                onClick={handleMarkForReview}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10"
              >
                Mark for Review
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Question Navigation Palette */}
        <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Question Palette</h3>
            
            <div className="grid grid-cols-4 gap-3 mb-8">
              {sectionQuestions.map((q, index) => {
                const status = answers[q.id]?.status || 'unvisited';
                
                // Color mapping:
                // Green: answered
                // Purple: marked
                // Violet+Dot: answered-marked
                // Red: not-answered
                // Grey: unvisited
                let colorClass = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
                if (status === 'answered') colorClass = 'bg-emerald-500 text-white';
                else if (status === 'marked') colorClass = 'bg-indigo-500 text-white';
                else if (status === 'answered-marked') colorClass = 'bg-purple-600 text-white relative';
                else if (status === 'not-answered') colorClass = 'bg-rose-500 text-white';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold font-mono transition-all text-sm ${colorClass} ${
                      currentQuestionIndex === index ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900' : ''
                    }`}
                  >
                    {index + 1}
                    {status === 'answered-marked' && (
                      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-purple-600"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Status Labels Legend */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 bg-emerald-500 rounded-lg flex shrink-0"></span>
              <span className="text-slate-600 dark:text-slate-400">Answered</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 bg-rose-500 rounded-lg flex shrink-0"></span>
              <span className="text-slate-600 dark:text-slate-400">Not Answered</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 bg-indigo-500 rounded-lg flex shrink-0"></span>
              <span className="text-slate-600 dark:text-slate-400">Marked for Review</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 bg-purple-600 rounded-lg flex shrink-0 relative">
                <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
              </span>
              <span className="text-slate-600 dark:text-slate-400">Answered & Marked</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-lg flex shrink-0"></span>
              <span className="text-slate-600 dark:text-slate-400">Unvisited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Alert Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="inline-flex p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="text-xl font-extrabold text-slate-950 dark:text-white mb-2">PROCTORING WARNING</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You left full-screen or switched tabs. Violation {violationsCount}/3 registered. Exceeding 3 violations triggers automatic submission.
            </p>
            <button
              onClick={() => {
                setShowWarningModal(false);
                enterFullscreen();
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all"
            >
              Return to Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockExamArena;
