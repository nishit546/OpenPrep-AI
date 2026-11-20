import React, { useState } from 'react';
import RubricFeedbackCard from './RubricFeedbackCard';

/**
 * SubjectiveQuestionView Component
 * Renders non-MCQ descriptive/essay questions with rich text area input,
 * word count counter, screen-reader status alert, side-by-side model answer comparison,
 * and integrated RubricFeedbackCard evaluation drawer.
 */
export default function SubjectiveQuestionView({
  question,
  questionIndex = 0,
  totalQuestions = 1,
  onEvaluateAnswer,
  onAnswerChange,
  existingAnswer = '',
  existingEvaluation = null,
}) {
  const [answerText, setAnswerText] = useState(existingAnswer);
  const [evaluation, setEvaluation] = useState(existingEvaluation);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  // Question details with fallbacks
  const {
    questionText = '',
    idealAnswer = '',
    maxScore = 10,
    rubricCriteria = [
      { category: 'Conceptual Accuracy', maxPoints: 3 },
      { category: 'Completeness', maxPoints: 3 },
      { category: 'Key Terminology', maxPoints: 2 },
      { category: 'Clarity', maxPoints: 2 },
    ],
    explanation = '',
  } = question || {};

  // Calculate current word count
  const words = answerText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isTooShort = wordCount > 0 && wordCount < 20;
  const isTooLong = wordCount > 1000;

  const handleEvaluate = async () => {
    if (wordCount < 20) {
      setErrorMsg('Answer is too short. Please provide at least 20 words for AI evaluation.');
      return;
    }
    if (isTooLong) {
      setErrorMsg('Answer exceeds the maximum 1,000 word limit.');
      return;
    }

    setErrorMsg('');
    setIsEvaluating(true);

    try {
      if (onEvaluateAnswer) {
        const result = await onEvaluateAnswer(question._id || question.id, answerText);
        setEvaluation(result);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Evaluation failed. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Screen Reader Status Alert for Accessibility */}
      <div role="status" aria-live="polite" className="sr-only">
        {isEvaluating ? 'Evaluating subjective answer with Gemini AI API...' : evaluation ? 'Answer evaluation complete.' : ''}
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Question {questionIndex + 1} of {totalQuestions}
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Subjective / Short Answer Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              Max Points: <strong className="text-amber-400 font-bold">{maxScore}</strong>
            </span>
          </div>
        </div>

        {/* Question Prompt */}
        <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-4 leading-relaxed">
          {questionText}
        </h2>

        {/* Rubric Criteria Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-slate-400 font-medium mr-1">Rubric Dimensions:</span>
          {rubricCriteria.map((rc, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
            >
              {rc.category || rc.title} ({rc.maxPoints || 2} pts)
            </span>
          ))}
        </div>

        {/* Written Answer Input Textarea */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="student-answer-textarea" className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>✍️</span> Your Written Response:
            </label>
            <span
              className={`font-mono text-xs ${
                isTooShort ? 'text-amber-400 font-bold' : isTooLong ? 'text-red-400 font-bold' : 'text-slate-400'
              }`}
            >
              Word Count: {wordCount} / 1,000 (Min: 20)
            </span>
          </div>

          <textarea
            id="student-answer-textarea"
            rows={8}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans text-sm leading-relaxed"
            placeholder="Type your detailed written answer here. Explain core principles, formulas, or architecture with relevant domain terminology..."
            value={answerText}
            onChange={(e) => {
              setAnswerText(e.target.value);
              setEvaluation(null);
              onAnswerChange?.(question._id || question.id, e.target.value);
            }}
            disabled={isEvaluating}
          />
        </div>

        {/* Warning / Error Message */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-2"
          >
            <span>{showComparison ? '🙈 Hide Ideal Model Response' : '👁️ Compare with Ideal Answer'}</span>
          </button>

          <button
            type="button"
            onClick={handleEvaluate}
            disabled={isEvaluating || wordCount < 20 || isTooLong}
            className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-lg flex items-center gap-2 ${
              isEvaluating || wordCount < 20 || isTooLong
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-indigo-600/20'
            }`}
          >
            {isEvaluating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Evaluating with Gemini...
              </>
            ) : (
              <>
                <span>🚀</span> Evaluate Answer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Side-by-Side Answer Comparison Drawer */}
      {showComparison && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>⚖️</span> Side-by-Side Answer Comparison
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Answer */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-semibold text-indigo-400 mb-2">Your Written Submission:</h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {answerText.trim() || <span className="text-slate-500 italic">No answer submitted yet.</span>}
              </p>
            </div>

            {/* Ideal Model Solution */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-semibold text-emerald-400 mb-2">Ideal Model Solution:</h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {idealAnswer || explanation || <span className="text-slate-500 italic">Model response available after grading.</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Animated Evaluation Results Drawer */}
      {evaluation && (
        <div className="animate-fadeIn transition-all duration-500">
          <RubricFeedbackCard evaluation={evaluation} />
        </div>
      )}
    </div>
  );
}
