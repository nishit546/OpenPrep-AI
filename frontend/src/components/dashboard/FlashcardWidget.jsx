import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, AlertCircle, RefreshCw, BookOpen, ChevronRight } from 'lucide-react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-300/60 rounded ${className}`} />
);

const FlashcardWidget = ({ flashcard = null, loading = false, error = null, totalDue = 0, onRetry }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when the flashcard changes (after render, not during)
  useEffect(() => {
    if (isFlipped) setIsFlipped(false);
  }, [flashcard]);

  if (loading) {
    return (
      <div className="relative w-full h-48 cursor-pointer perspective-1000">
        <div className="w-full h-full bg-white shadow-md border border-neutral-300 rounded-sm p-6 flex flex-col justify-center items-center">
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <Shimmer className="w-3 h-3" />
            <Shimmer className="h-3 w-16" />
          </div>
          <Shimmer className="h-5 w-3/4 mb-2" />
          <Shimmer className="h-5 w-1/2" />
          <Shimmer className="h-3 w-20 absolute bottom-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full h-48 cursor-pointer perspective-1000">
        <div className="w-full h-full bg-white shadow-md border border-neutral-300 rounded-sm p-6 flex flex-col justify-center items-center">
          <AlertCircle className="w-8 h-8 text-neutral-400 mb-2" />
          <p className="text-sm text-neutral-500 text-center mb-3">Could not load cards</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-yellow-700 hover:text-yellow-800 font-semibold text-xs uppercase tracking-wider"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!flashcard) {
    return (
      <div className="relative w-full h-48 cursor-pointer perspective-1000">
        <div className="w-full h-full bg-white shadow-md border border-neutral-300 rounded-sm p-6 flex flex-col justify-center items-center">
          <BookOpen className="w-10 h-10 text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-500 italic text-center">
            {totalDue === 0 ? 'All caught up! No cards due.' : 'No due flashcards'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        className="w-full h-full relative preserve-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of Card */}
        <div
          className="absolute inset-0 bg-white shadow-md border border-neutral-300 rounded-sm p-6 flex flex-col justify-center items-center backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="absolute top-2 left-2 flex items-center text-xs font-bold text-yellow-600 uppercase tracking-widest">
            <Lightbulb className="w-3 h-3 mr-1" />
            Due Cards
            {totalDue > 1 && (
              <span className="ml-1 text-neutral-400 normal-case font-normal tracking-normal">
                ({totalDue} due)
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold font-inter text-neutral-800 text-center leading-snug">
            {flashcard.front}
          </h3>
          <p className="absolute bottom-2 text-xs text-neutral-400 italic">Click to flip</p>
        </div>

        {/* Back of Card */}
        <div
          className="absolute inset-0 bg-yellow-50 shadow-md border border-yellow-200 rounded-sm p-6 flex flex-col justify-center items-center backface-hidden text-center overflow-y-auto"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="absolute top-2 right-2 flex items-center text-xs text-yellow-600">
            <ChevronRight className="w-3 h-3" />
            <span>Click to flip back</span>
          </div>
          <h3 className="text-lg font-bold font-inter text-blue-900 mb-2">Answer</h3>
          <p className="text-sm text-neutral-700 font-inter leading-relaxed">
            {flashcard.back}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default FlashcardWidget;
