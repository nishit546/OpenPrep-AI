import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { biDirectionalMindMapService } from '../../services/biDirectionalMindMapService';

export const DynamicQuizCardSynthesizerModal = ({
  isOpen,
  onClose,
  mindMapId,
  quizCards = [],
  onNodeMasteryUpdated,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [recording, setRecording] = useState(false);

  if (!isOpen || quizCards.length === 0) return null;

  const currentCard = quizCards[currentIndex] || quizCards[0];
  const isCorrect = selectedOption === currentCard.correctAnswer;

  const handleOptionSelect = (option) => {
    if (submitted) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || submitted) return;
    setSubmitted(true);

    if (mindMapId && currentCard.targetNodeId) {
      try {
        setRecording(true);
        const res = await biDirectionalMindMapService.recordNodeMastery(mindMapId, {
          nodeId: currentCard.targetNodeId,
          isCorrect,
        });

        if (res?.success && onNodeMasteryUpdated) {
          onNodeMasteryUpdated(res.data);
        }
      } catch (err) {
        console.error('Failed to record node mastery:', err);
      } finally {
        setRecording(false);
      }
    }
  };

  const handleNextCard = () => {
    setSelectedOption(null);
    setSubmitted(false);
    if (currentIndex < quizCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Dynamic Quiz Card Synthesis
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  {currentIndex + 1} / {quizCards.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Target Node: <span className="font-semibold text-slate-200">{currentCard.nodeLabel}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Question Prompt */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Active-Recall Question
            </span>
            <p className="text-base font-semibold text-white leading-relaxed">
              {currentCard.question}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentCard.options.map((option, idx) => {
              let isSelected = selectedOption === option;
              let optionStyle = 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900';

              if (submitted) {
                if (option === currentCard.correctAnswer) {
                  optionStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium';
                } else if (isSelected) {
                  optionStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                } else {
                  optionStyle = 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                optionStyle = 'bg-indigo-500/20 border-indigo-500 text-indigo-200 font-medium';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(option)}
                  disabled={submitted}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full border border-current/30 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </span>
                  {submitted && option === currentCard.correctAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {submitted && isSelected && option !== currentCard.correctAnswer && (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {submitted && (
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 animate-fadeIn ${
              isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                <span>{isCorrect ? 'Correct! Mind Map Node Mastery Increased (+25%)' : 'Needs Review (-20% Node Mastery)'}</span>
              </div>
              <p className="text-slate-300 leading-relaxed pl-6">{currentCard.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            {recording && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
            {recording ? 'Updating Mind Map Heatmap...' : 'Bi-directional feedback sync active'}
          </span>

          {!submitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOption}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNextCard}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <span>{currentIndex < quizCards.length - 1 ? 'Next Quiz Card' : 'Finish & View Heatmap'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicQuizCardSynthesizerModal;
