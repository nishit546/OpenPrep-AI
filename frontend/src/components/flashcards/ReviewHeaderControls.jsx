import React from 'react';
import { Shuffle } from 'lucide-react';
import { STUDY_MODES } from '../../utils/flashcardStudy';

const OPTIONS = [
  { value: STUDY_MODES.STANDARD, label: 'Standard' },
  { value: STUDY_MODES.REVERSE, label: 'Reverse' },
  { value: STUDY_MODES.MIXED, label: 'Mixed' },
];

export default function ReviewHeaderControls({ mode, onModeChange, onShuffle }) {
  return (
    <div className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-3 mb-6">
      <div
        role="radiogroup"
        aria-label="Study mode"
        className="inline-flex rounded-lg bg-neutral-200 dark:bg-slate-800 p-1"
      >
        {OPTIONS.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onModeChange(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                active
                  ? 'bg-white dark:bg-slate-600 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onShuffle}
        aria-keyshortcuts="S"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-slate-700 transition-colors"
      >
        <Shuffle className="w-4 h-4" />
        Shuffle
      </button>
    </div>
  );
}
