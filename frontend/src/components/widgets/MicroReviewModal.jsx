import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCw,
  Clock,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getNextDueMicroCard, submitMicroAnswer } from '../../services/api';
import {
  getMicroSettings,
  saveMicroSettings,
  isQuietHour,
} from '../../services/microScheduleWorker';

export default function MicroReviewModal({ isOpen, onClose, onItemAnswered }) {
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState(null);
  const [itemType, setItemType] = useState('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [stats, setStats] = useState({ xpEarned: 0, streak: 0 });

  const fetchDueItem = async () => {
    setLoading(true);
    setAnswered(false);
    setIsFlipped(false);
    setSelectedOption(null);
    setFeedback(null);
    setCountdown(null);

    try {
      const res = await getNextDueMicroCard();
      if (res.data?.success && res.data?.item) {
        setItem(res.data.item);
        setItemType(res.data.type || 'flashcard');
      }
    } catch (err) {
      console.warn('Failed to load micro-learning item:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDueItem();
    }
  }, [isOpen]);

  // Handle countdown auto-dismiss
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleClose();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleClose = () => {
    setCountdown(null);
    setAnswered(false);
    onClose();
  };

  const handleSelectOption = async (option) => {
    if (answered || !item) return;
    setSelectedOption(option);
    setAnswered(true);

    const isCorrect = option === item.answer;
    setFeedback({
      isCorrect,
      explanation: item.back || item.answer || 'Good effort! Review regularly for optimal recall.',
    });

    try {
      const res = await submitMicroAnswer({
        itemId: item.id,
        itemType,
        selectedAnswer: option,
        isCorrect,
        quality: isCorrect ? 5 : 2,
      });

      if (res.data?.success) {
        setStats({
          xpEarned: res.data.xpEarned || 15,
          streak: res.data.streak || 0,
        });
        if (typeof onItemAnswered === 'function') {
          onItemAnswered(res.data);
        }
      }
    } catch (err) {
      console.error('Error submitting micro answer:', err);
    }

    const settings = getMicroSettings();
    setCountdown(settings.autoDismissSeconds || 5);
  };

  const handleFlashcardRating = async (quality) => {
    if (answered || !item) return;
    setAnswered(true);
    const isCorrect = quality >= 3;

    setFeedback({
      isCorrect,
      explanation: item.back || 'Flashcard review synced with spaced repetition schedule.',
    });

    try {
      const res = await submitMicroAnswer({
        itemId: item.id,
        itemType: 'flashcard',
        quality,
        isCorrect,
      });

      if (res.data?.success) {
        setStats({
          xpEarned: res.data.xpEarned || 15,
          streak: res.data.streak || 0,
        });
        if (typeof onItemAnswered === 'function') {
          onItemAnswered(res.data);
        }
      }
    } catch (err) {
      console.error('Error recording flashcard rating:', err);
    }

    const settings = getMicroSettings();
    setCountdown(settings.autoDismissSeconds || 5);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="micro-widget-title"
      className="fixed bottom-6 right-6 z-50 w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h2 id="micro-widget-title" className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Micro-Learning Quick Dose
              </h2>
              <p className="text-[10px] text-slate-400">
                {item?.subject || 'Quick Review'} • {item?.topic || 'Spaced Recall'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close micro review modal"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <RotateCw className="h-6 w-6 animate-spin text-amber-400" />
            <p className="text-xs text-slate-400">Loading next due micro-dose...</p>
          </div>
        ) : !item ? (
          <div className="flex h-36 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
            <p className="text-xs font-semibold text-slate-200">All caught up!</p>
            <p className="text-[11px] text-slate-400">No overdue items for micro-review.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {/* Prompt / Question */}
            <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/50">
              <p className="text-xs font-medium leading-relaxed text-slate-200">
                {item.question || item.front}
              </p>
            </div>

            {/* Flashcard View */}
            {itemType === 'flashcard' && !item.options?.length && (
              <div className="space-y-2">
                {!isFlipped ? (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full rounded-xl bg-indigo-600/20 border border-indigo-500/30 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Flip to Reveal Answer
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/40 p-2.5 text-xs text-indigo-200 leading-normal">
                      <p className="font-semibold text-indigo-300 mb-1">Answer:</p>
                      {item.back}
                    </div>
                    {!answered && (
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          onClick={() => handleFlashcardRating(1)}
                          className="rounded-lg bg-rose-500/20 border border-rose-500/30 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/30 transition"
                        >
                          Hard (1)
                        </button>
                        <button
                          onClick={() => handleFlashcardRating(3)}
                          className="rounded-lg bg-amber-500/20 border border-amber-500/30 py-1.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30 transition"
                        >
                          Good (3)
                        </button>
                        <button
                          onClick={() => handleFlashcardRating(5)}
                          className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition"
                        >
                          Easy (5)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Multiple Choice Options */}
            {Boolean(item.options && item.options.length > 0) && (
              <div className="space-y-1.5">
                {item.options.map((opt, idx) => {
                  let btnClass = 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80';
                  if (answered) {
                    if (opt === item.answer) {
                      btnClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold';
                    } else if (opt === selectedOption) {
                      btnClass = 'bg-rose-500/20 border-rose-500/50 text-rose-300';
                    } else {
                      btnClass = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={answered}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left rounded-xl border p-2 text-xs transition duration-150 flex items-start gap-2 ${btnClass}`}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-700/50 text-[10px] font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-tight flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Answer Feedback & Reward */}
            {feedback && (
              <div
                className={`rounded-xl border p-2.5 text-xs transition-all ${
                  feedback.isCorrect
                    ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-800/40 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    {feedback.isCorrect ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Correct! +{stats.xpEarned} XP</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                        <span>Review Note</span>
                      </>
                    )}
                  </div>
                  {countdown !== null && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Closing in {countdown}s
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-tight text-slate-300 opacity-90">{feedback.explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer controls */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            Spaced Micro-Learning
          </span>
          <button
            onClick={fetchDueItem}
            className="hover:text-slate-200 flex items-center gap-1 transition"
          >
            <RotateCw className="h-2.5 w-2.5" />
            Next Item
          </button>
        </div>
      </div>
    </div>
  );
}

MicroReviewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onItemAnswered: PropTypes.func,
};
