import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Circle, Share2, Copy, Check, Flame, Trophy, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDailyQuote } from '../../services/quotesData';
import QuoteShareModal from './QuoteShareModal';

export default function DailyMotivationWidget() {
  const [quote, setQuote] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Micro-habit checklist items
  const HABITS_CONFIG = [
    { id: 'deck', label: 'Complete 1 Spaced Repetition deck', xp: '+25 XP' },
    { id: 'quiz', label: 'Practice 10 PYQ quiz questions', xp: '+30 XP' },
    { id: 'note', label: 'Read 1 topic summary note', xp: '+15 XP' },
  ];

  const getTodayDateKey = () => {
    const today = new Date();
    return `openprep_habits_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}`;
  };

  const [habitsState, setHabitsState] = useState(() => {
    try {
      const saved = localStorage.getItem(getTodayDateKey());
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read habits from localStorage:', e);
    }
    return { deck: false, quiz: false, note: false };
  });

  useEffect(() => {
    setQuote(getDailyQuote(new Date()));
  }, []);

  const triggerConfetti = () => {
    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899']
        });
      }
    } catch (e) {
      console.warn('Confetti trigger failed:', e);
    }
  };

  const toggleHabit = (id) => {
    setHabitsState((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      const storageKey = getTodayDateKey();
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save habits to localStorage:', e);
      }

      // Check if all 3 habits completed now
      const allCompleted = HABITS_CONFIG.every((h) => updated[h.id]);
      if (allCompleted && !prev[id]) {
        triggerConfetti();
      }

      return updated;
    });
  };

  const handleCopyQuote = async () => {
    if (!quote) return;
    const formatted = `"${quote.quote}" — ${quote.author} (${quote.field})`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy quote: ', err);
    }
  };

  const completedCount = HABITS_CONFIG.filter((h) => habitsState[h.id]).length;
  const progressPercent = Math.round((completedCount / HABITS_CONFIG.length) * 100);

  if (!quote) return null;

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-neutral-950/90 backdrop-blur-xl border border-neutral-800/80 p-6 shadow-xl overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Daily Study Motivation
            </h3>
            <p className="text-[11px] text-neutral-400">
              Micro-habits & academic quote of the day
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyQuote}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800/70 hover:bg-neutral-800 transition cursor-pointer"
            title="Copy Quote"
            aria-label="Copy Quote"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800/70 hover:bg-neutral-800 transition cursor-pointer"
            title="Share Quote"
            aria-label="Share Quote"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quote Container */}
      <div className="mb-5 p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/70">
        <p className="text-xs md:text-sm italic font-serif text-neutral-200 leading-relaxed mb-2">
          "{quote.quote}"
        </p>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-amber-400">— {quote.author}</span>
          <span className="text-neutral-500 truncate max-w-[180px]">{quote.field}</span>
        </div>
      </div>

      {/* Daily Micro-Habits Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            Today's Micro-Goals ({completedCount}/{HABITS_CONFIG.length})
          </span>
          <span className="text-[11px] font-mono font-bold text-amber-400">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Habit items */}
        <div className="space-y-2 pt-1">
          {HABITS_CONFIG.map((habit) => {
            const isDone = Boolean(habitsState[habit.id]);
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  )}
                  <span className={isDone ? 'line-through text-neutral-400' : ''}>
                    {habit.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400">
                  {habit.xp}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Celebratory badge when all 3 habits completed */}
      {completedCount === HABITS_CONFIG.length && (
        <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300 animate-pulse">
          <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Awesome! All micro-goals completed for today.</span>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <QuoteShareModal
          quote={quote}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
