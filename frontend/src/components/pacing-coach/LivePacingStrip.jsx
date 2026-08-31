import PropTypes from 'prop-types';
import { AlertTriangle, Gauge, Timer } from 'lucide-react';

/**
 * The strip shown above the current question during an attempt: how much of
 * this question's budget has been used, how the attempt as a whole is pacing,
 * and whether the current question has crossed the time-bleed threshold.
 */

/** Pace states the backend returns, with the colour each reads as. */
const PACE_STATES = {
  ahead: {
    label: 'Ahead',
    chip: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    bar: 'bg-sky-400',
  },
  on_track: {
    label: 'On track',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    bar: 'bg-emerald-400',
  },
  behind: {
    label: 'Behind',
    chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    bar: 'bg-amber-400',
  },
  critical: {
    label: 'Critical',
    chip: 'bg-red-500/15 text-red-300 border-red-500/30',
    bar: 'bg-red-400',
  },
};

const BLEEDING = {
  label: 'Time bleed',
  chip: 'bg-red-500/20 text-red-200 border-red-500/40',
  bar: 'bg-red-500',
};

/** m:ss, clamped at zero — a negative remaining time reads as a bug, not -0:12. */
function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);

  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

// React 19 dropped defaultProps for function components, so every default
// lives in the destructuring. bleedThreshold matches detectTimeBleed's default
// in backend/services/pacingCoachService.js — read it from there before
// changing it here.
const LivePacingStrip = ({
  currentQuestionOrder,
  budgetSeconds,
  elapsedSeconds,
  paceState = 'on_track',
  remainingTime = 0,
  projectedUnanswered = 0,
  bleedThreshold = 1.75,
}) => {
  const utilisation = budgetSeconds > 0 ? (elapsedSeconds / budgetSeconds) * 100 : 0;
  const isBleeding = budgetSeconds > 0 && elapsedSeconds > budgetSeconds * bleedThreshold;
  const isOverBudget = utilisation > 100;

  const state = PACE_STATES[paceState] || PACE_STATES.on_track;
  const tone = isBleeding ? BLEEDING : state;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isBleeding ? 'border-red-500/40 bg-red-950/30' : 'border-stone-700/40 bg-stone-900/60'
      }`}
      data-testid="live-pacing-strip"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
          <Timer className="h-4 w-4 text-amber-400" />
          Question {currentQuestionOrder} pacing
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tone.chip}`}
          data-testid="pace-state-chip"
        >
          {isBleeding ? <AlertTriangle className="h-3 w-3" /> : <Gauge className="h-3 w-3" />}
          {tone.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
        <span>
          This question{' '}
          <span className="font-mono text-stone-200">
            {formatClock(elapsedSeconds)} / {formatClock(budgetSeconds)}
          </span>
        </span>
        <span>
          Remaining <span className="font-mono text-stone-200">{formatClock(remainingTime)}</span>
        </span>
      </div>

      {/*
        The bar caps at 100% so it stays readable once the budget is blown. The
        overspend is carried by the colour and by the numbers above it, rather
        than by a bar that runs off the end of its track.
      */}
      <div
        className="h-2.5 rounded-full bg-stone-800 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(utilisation, 100))}
        aria-label={`Question ${currentQuestionOrder} budget used`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isBleeding ? BLEEDING.bar : isOverBudget ? 'bg-amber-400' : tone.bar
          }`}
          style={{ width: `${Math.min(utilisation, 100)}%` }}
        />
      </div>

      {isBleeding && (
        <p className="mt-2 text-xs text-red-300 flex items-start gap-1.5" data-testid="bleed-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
          You are spending significantly longer than this question&apos;s budget. Consider flagging
          it and moving on.
        </p>
      )}

      {projectedUnanswered > 0 && (
        <p className="mt-2 text-xs text-amber-300" data-testid="projected-unanswered">
          At this rate you will leave <span className="font-semibold">{projectedUnanswered}</span>{' '}
          {projectedUnanswered === 1 ? 'question' : 'questions'} unanswered.
        </p>
      )}
    </div>
  );
};

LivePacingStrip.propTypes = {
  currentQuestionOrder: PropTypes.number.isRequired,
  budgetSeconds: PropTypes.number.isRequired,
  elapsedSeconds: PropTypes.number.isRequired,
  paceState: PropTypes.oneOf(Object.keys(PACE_STATES)),
  remainingTime: PropTypes.number,
  projectedUnanswered: PropTypes.number,
  bleedThreshold: PropTypes.number,
};

export default LivePacingStrip;
