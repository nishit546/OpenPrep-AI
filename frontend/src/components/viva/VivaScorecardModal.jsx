import React from 'react';
import { FaTimes, FaTrophy, FaGraduationCap, FaRedo } from 'react-icons/fa';

export default function VivaScorecardModal({ isOpen, onClose, scorecard, onRestart }) {
  if (!isOpen || !scorecard) return null;

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorecard-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div className="bg-neutral-900 border border-neutral-850 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden flex flex-col space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-850 pb-4">
          <h2 id="scorecard-title" className="text-stone-100 font-extrabold font-playfair text-lg flex items-center gap-2">
            <FaGraduationCap className="text-indigo-400" /> Viva Performance Scorecard
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-stone-300 hover:text-stone-100 rounded-full transition cursor-pointer"
            aria-label="Close scorecard dialog"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          
          {/* Overall score card */}
          <div className="flex items-center justify-between bg-stone-950/40 p-4 rounded-2xl border border-neutral-850">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Overall Viva Score</span>
              <span className="text-3xl font-black text-indigo-400">{scorecard.score || 0} <span className="text-xs text-stone-500 font-normal">/ 100</span></span>
            </div>
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
              <FaTrophy className="text-2xl text-indigo-400 animate-bounce" />
            </div>
          </div>

          {/* Rubrics breakdown */}
          <div className="space-y-4">
            <h3 className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Rubrics Assessment</h3>
            
            <div className="space-y-3">
              {[
                { label: 'Conceptual Clarity', score: scorecard.conceptualDepth },
                { label: 'Technical Accuracy', score: scorecard.technicalAccuracy },
                { label: 'Communication Clarity', score: scorecard.communicationClarity },
                { label: 'Vocabulary Precision', score: scorecard.vocabularyPrecision },
                { label: 'Answer Conciseness', score: scorecard.answerConciseness },
              ].map((rubric) => (
                <div key={rubric.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-stone-300">
                    <span>{rubric.label}</span>
                    <span className="font-bold">{rubric.score || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(rubric.score)}`}
                      style={{ width: `${rubric.score || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advice/Feedback */}
          <div className="space-y-2">
            <h3 className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Examiner Feedback</h3>
            <p className="text-stone-300 text-xs leading-relaxed bg-stone-950/20 p-4 rounded-2xl border border-neutral-850/80">
              {scorecard.feedback || 'Excellent performance overall. Focus on technical accuracy.'}
            </p>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-850">
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-stone-300 rounded-xl text-xs font-bold transition border border-neutral-750 cursor-pointer flex items-center gap-1.5"
          >
            <FaRedo /> Practice Again
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
