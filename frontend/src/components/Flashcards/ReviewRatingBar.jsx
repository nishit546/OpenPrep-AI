import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sliders, ShieldCheck } from 'lucide-react';

const FACTOR = 19.0 / 81.0;
const DECAY = -0.5;

/**
 * Standard FSRS v4 Default Parameter Weights (w0 through w16)
 */
const DEFAULT_PARAMETERS = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01,
  1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61,
];

function calculateRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0.0;
  if (elapsedDays <= 0) return 1.0;
  const factorRatio = (FACTOR * elapsedDays) / stability;
  const r = Math.pow(1 + factorRatio, DECAY);
  return Math.max(0.0, Math.min(1.0, r));
}

function calculateInterval(requestedRetention, stability) {
  const r = Math.max(0.70, Math.min(0.99, requestedRetention));
  const s = Math.max(0.1, stability);
  const power = Math.pow(r, 1.0 / DECAY) - 1.0;
  const interval = (s / FACTOR) * power;
  return Math.max(1, Math.round(interval));
}

function clampDifficulty(d) {
  return Math.max(1.0, Math.min(10.0, d));
}

function formatInterval(days, rating) {
  if (rating === 1) return '10m';
  if (days <= 0) return '10m';
  if (days === 1) return '1d';
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/**
 * Predict next stability and intervals for FSRS v4
 */
function predictNextFSRS(card, rating, requestedRetention) {
  const G = Number(rating);
  let stability = Number(card?.stability);
  let difficulty = Number(card?.fsrsDifficulty ?? card?.difficulty);
  const reps = Number(card?.reps ?? card?.repetitions ?? 0);

  if (isNaN(stability) || isNaN(difficulty)) {
    const ef = Math.max(1.3, Math.min(3.0, Number(card?.efactor) || 2.5));
    difficulty = clampDifficulty(11.0 - ef * 3.0);
    stability = Math.max(0.1, Number(card?.interval) || 1.0);
  }

  let elapsedDays = 0;
  if (card?.lastReviewedAt || card?.updatedAt) {
    const lastDate = new Date(card.lastReviewedAt || card.updatedAt).getTime();
    elapsedDays = Math.max(0, Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)));
  }

  const w = DEFAULT_PARAMETERS;
  let newStability;

  if (reps === 0) {
    newStability = w[G - 1];
  } else {
    const r = calculateRetrievability(elapsedDays, stability);
    const nextD = difficulty - w[6] * (G - 3);
    const newDiff = clampDifficulty(w[7] * w[4] + (1 - w[7]) * nextD);

    if (G === 1) {
      const forgetBase = w[11];
      const dFactor = Math.pow(newDiff, -w[12]);
      const sFactor = Math.pow(stability + 1, w[13]) - 1;
      const rFactor = Math.exp((1 - r) * w[14]);
      newStability = Math.max(0.1, forgetBase * dFactor * sFactor * rFactor);
    } else {
      const hardPenalty = G === 2 ? w[15] : 1.0;
      const easyBonus = G === 4 ? w[16] : 1.0;
      const recallBase = Math.exp(w[8]);
      const dFactor = 11 - newDiff;
      const sFactor = Math.pow(stability, -w[9]);
      const rFactor = Math.exp((1 - r) * w[10]) - 1;
      newStability = Math.max(0.1, stability * (1 + recallBase * dFactor * sFactor * rFactor * hardPenalty * easyBonus));
    }
  }

  const nextInterval = G === 1 ? 1 : calculateInterval(requestedRetention, newStability);
  return {
    interval: nextInterval,
    formatted: formatInterval(nextInterval, G),
    stability: newStability,
  };
}

/**
 * ReviewRatingBar Component
 * Displays FSRS v4 ratings (Again: 10m, Hard: 2d, Good: 6d, Easy: 14d)
 * with user customizable target retention.
 */
const ReviewRatingBar = ({ card, onRate, submitting = false, disabled = false }) => {
  const [retention, setRetention] = useState(() => {
    try {
      const saved = localStorage.getItem('fsrs_target_retention');
      return saved ? parseFloat(saved) : 0.90;
    } catch {
      return 0.90;
    }
  });

  const [showSettings, setShowSettings] = useState(false);

  const handleRetentionChange = (newRetention) => {
    setRetention(newRetention);
    try {
      localStorage.setItem('fsrs_target_retention', String(newRetention));
    } catch {
      // Ignore storage errors
    }
  };

  // Compute live upcoming intervals for this card
  const upcomingIntervals = useMemo(() => {
    if (!card) {
      return {
        1: { formatted: '10m', interval: 1 },
        2: { formatted: '2d', interval: 2 },
        3: { formatted: '6d', interval: 6 },
        4: { formatted: '14d', interval: 14 },
      };
    }

    return {
      1: predictNextFSRS(card, 1, retention),
      2: predictNextFSRS(card, 2, retention),
      3: predictNextFSRS(card, 3, retention),
      4: predictNextFSRS(card, 4, retention),
    };
  }, [card, retention]);

  // Current retrievability estimate
  const currentRetrievability = useMemo(() => {
    if (!card) return null;
    let stability = Number(card.stability);
    if (isNaN(stability)) stability = Math.max(0.1, Number(card.interval) || 1.0);
    let elapsedDays = 0;
    if (card.lastReviewedAt || card.updatedAt) {
      const lastDate = new Date(card.lastReviewedAt || card.updatedAt).getTime();
      elapsedDays = Math.max(0, Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)));
    }
    const r = calculateRetrievability(elapsedDays, stability);
    return Math.round(r * 100);
  }, [card]);

  const buttons = [
    {
      rating: 1,
      qualityEquivalent: 1,
      label: 'Again',
      colorClass: 'border-red-300 dark:border-red-800/60 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300',
      badgeClass: 'bg-red-200/80 dark:bg-red-900/60 text-red-800 dark:text-red-200',
    },
    {
      rating: 2,
      qualityEquivalent: 2,
      label: 'Hard',
      colorClass: 'border-amber-300 dark:border-amber-800/60 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300',
      badgeClass: 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
    },
    {
      rating: 3,
      qualityEquivalent: 4,
      label: 'Good',
      colorClass: 'border-blue-300 dark:border-blue-800/60 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300',
      badgeClass: 'bg-blue-200/80 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
    },
    {
      rating: 4,
      qualityEquivalent: 5,
      label: 'Easy',
      colorClass: 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300',
      badgeClass: 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
    },
  ];

  return (
    <div className="w-full">
      {/* Top Bar: Algorithm badge & Retention Target Settings Toggle */}
      <div className="flex items-center justify-between mb-3 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
            FSRS v4 DSR Scheduler
          </span>
          {currentRetrievability !== null && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800 font-mono">
              Retention: {currentRetrievability}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          title="Adjust Target Retention Rate"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Target: {Math.round(retention * 100)}%</span>
        </button>
      </div>

      {/* Expandable Retention Selector */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Desired Retention Rate:
            </label>
            <div className="flex items-center gap-2">
              {[0.80, 0.85, 0.90, 0.95].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRetentionChange(rate)}
                  className={`px-2.5 py-1 text-xs rounded-md font-mono transition-all ${
                    retention === rate
                      ? 'bg-primary-600 text-white font-bold shadow-sm'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {Math.round(rate * 100)}%
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-400">
            Higher retention targets (e.g., 95%) shorten intervals for closer reviews; lower targets (e.g., 85%) stretch intervals to reduce study time by ~20%.
          </p>
        </motion.div>
      )}

      {/* 4 FSRS Rating Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buttons.map((btn) => {
          const prediction = upcomingIntervals[btn.rating];
          return (
            <button
              key={btn.rating}
              type="button"
              disabled={submitting || disabled}
              onClick={() => onRate(btn.rating, btn.qualityEquivalent, retention)}
              aria-label={`${btn.label} - due in ${prediction?.formatted} (Key ${btn.rating})`}
              className={`relative py-3 px-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${btn.colorClass}`}
            >
              {/* Dynamic Upcoming Interval Badge */}
              <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full mb-1.5 ${btn.badgeClass}`}>
                <Clock className="w-3 h-3" />
                {prediction?.formatted}
              </span>

              {/* Rating Label */}
              <span className="font-bold text-base leading-tight tracking-tight">
                {btn.label}
              </span>

              {/* Keyboard Shortcut Indicator */}
              <span className="mt-1 px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/10 dark:bg-white/10 opacity-70">
                [{btn.rating}]
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewRatingBar;
