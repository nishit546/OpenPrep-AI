import React, { useState } from 'react';
import { Lightbulb, RotateCw, Play, X } from 'lucide-react';
import MathRenderer from './common/MathRenderer';
import AudioReader from './AudioReader';
import FactualityVerificationBadge from './factuality/FactualityVerificationBadge';

const FlashcardCard = ({ flashcard, style, rowIndex, columnIndex, cardIndex }) => {  const [isFlipped, setIsFlipped] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [cardBack, setCardBack] = useState(flashcard?.back || '');

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFlip();
    }
  };

  const getYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const formatSeconds = (totalSeconds) => {
    if (!totalSeconds) return '0:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={style}
      className="p-2"
      role="gridcell"
      aria-rowindex={rowIndex + 1}
      aria-colindex={columnIndex + 1}
    >            <div
        role="button"
        tabIndex={0}
        data-card-index={cardIndex}
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        aria-label={isFlipped ? 'Show front of card' : 'Show back of card'}
        className="w-full h-full relative cursor-pointer select-none perspective-1000"
        style={{
          touchAction: 'manipulation',
        }}
      >
        <div
          className="w-full h-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            willChange: 'transform',
          }}
        >
          {/* Front Side */}
          <div
            className="absolute inset-0 bg-white dark:bg-slate-800 shadow-md border border-neutral-300 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between items-center backface-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="w-full flex justify-between items-center text-[10px] font-bold text-yellow-600 uppercase tracking-widest font-mono">
              <span className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-500" /> Question
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                <AudioReader text={flashcard?.front} />
              </div>
            </div>
            <div className="text-center font-bold text-sm text-neutral-800 dark:text-neutral-100 overflow-y-auto max-h-[70%]">
              {flashcard?.front ? (
                <MathRenderer text={flashcard.front} />
              ) : (
                'Empty Front'
              )}
            </div>
            <div className="w-full flex justify-between items-center text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 animate-spin-slow" /> Flip Card
              </span>
              {flashcard?.sourceUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVideoModal(true);
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold transition z-20 cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5 fill-white" />
                  {formatSeconds(flashcard.timestampSeconds)}
                </button>
              )}
            </div>
          </div>

          {/* Back Side */}
          <div
            className="absolute inset-0 bg-amber-50 dark:bg-slate-900 shadow-md border border-yellow-200 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between items-center backface-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="w-full flex justify-between items-center text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-widest font-mono">
              <span className="flex items-center gap-1.5">
                Answer
                <FactualityVerificationBadge
                  targetType="flashcard"
                  targetId={flashcard?.id}
                  front={flashcard?.front}
                  back={cardBack}
                  sourceContext={flashcard?.sourceUrl || ''}
                  size="sm"
                  onCorrectionApplied={(newText) => setCardBack(newText)}
                />
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                <AudioReader text={cardBack} />
              </div>
            </div>
            <div className="text-center text-xs text-neutral-800 dark:text-neutral-200 overflow-y-auto max-h-[70%] bg-transparent">
              {cardBack ? (
                <MathRenderer text={cardBack} />
              ) : (
                'Empty Back'
              )}
            </div>
            <div className="w-full flex justify-between items-center text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" /> Flip Card
              </span>
              {flashcard?.sourceUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVideoModal(true);
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold transition z-20 cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5 fill-white" />
                  {formatSeconds(flashcard.timestampSeconds)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal Overlay */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 max-w-xl w-full flex flex-col gap-4 relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowVideoModal(false);
              }}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-stone-400 hover:text-white cursor-pointer z-50 shadow-md"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
              <iframe
                title="YouTube Reference Clip"
                src={`https://www.youtube.com/embed/${getYouTubeId(flashcard.sourceUrl)}?start=${flashcard.timestampSeconds}&autoplay=1`}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay"
              />
            </div>
            <div className="text-center text-xs font-semibold text-stone-400 font-mono">
              Reference Playback Timestamp: {formatSeconds(flashcard.timestampSeconds)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardCard;
