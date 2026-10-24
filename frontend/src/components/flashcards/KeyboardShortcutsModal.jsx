import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Sparkles } from 'lucide-react';
import useFocusTrap from '../../hooks/useFocusTrap';

/**
 * KeyboardShortcutsModal Component
 * Interactive modal listing all flashcard review keyboard navigation shortcuts.
 */
export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const containerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

    const shortcutGroups = [
    {
      title: 'Flashcards',
      shortcuts: [
        { key: 'Space / Enter', label: 'Flip the flashcard' },
        { key: '1', label: 'Rate Wrong' },
        { key: '2', label: 'Rate Hard' },
        { key: '3', label: 'Rate Good' },
        { key: '4', label: 'Rate Easy' },
        { key: '← / P', label: 'Previous card' },
        { key: '→ / N', label: 'Next card' },
        { key: 'R', label: 'Toggle reverse mode' },
        { key: 'S', label: 'Shuffle remaining cards' },
      ],
    },
    {
      title: 'Global',
      shortcuts: [
        { key: 'Ctrl / Cmd + K', label: 'Open global search' },
        { key: 'Ctrl / Cmd + /', label: 'Open keyboard shortcuts' },
        { key: '?', label: 'Open / close this guide' },
        { key: 'Esc', label: 'Close modal or go back' },
      ],
    },
  ];
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="keyboard-shortcuts-modal-title"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-slate-700 p-6 z-10 space-y-5 overflow-hidden"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-indigo-500" />
              <h3 id="keyboard-shortcuts-modal-title" className="text-lg font-bold font-inter text-neutral-800 dark:text-neutral-100">
                Keyboard Shortcuts Guide
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categorized Shortcuts */}
          <div className="space-y-5">
            {shortcutGroups.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <h4 className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {group.title}
                </h4>

                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={`${group.title}-${shortcut.key}`}
                      className="flex items-center justify-between gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-slate-900/60 border border-neutral-200/60 dark:border-slate-700/60 text-xs"
                    >
                      <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                        {shortcut.label}
                      </span>

                      <kbd className="shrink-0 px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Bottom Info Footer */}
          <div className="pt-2 border-t border-neutral-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Power-user shortcuts disabled when typing in inputs.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
