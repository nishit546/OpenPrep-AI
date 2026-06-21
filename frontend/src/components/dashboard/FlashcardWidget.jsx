import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

const FlashcardWidget = () => {
  const [isFlipped, setIsFlipped] = useState(false);

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
            Daily Card
          </div>
          <h3 className="text-xl font-bold font-inter text-neutral-800 text-center">What is the time complexity of QuickSort in the worst case?</h3>
          <p className="absolute bottom-2 text-xs text-neutral-400 italic">Click to flip</p>
        </div>

        {/* Back of Card */}
        <div 
          className="absolute inset-0 bg-yellow-50 shadow-md border border-yellow-200 rounded-sm p-6 flex flex-col justify-center items-center backface-hidden text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <h3 className="text-2xl font-bold font-inter text-blue-900 mb-2">O(n²)</h3>
          <p className="text-sm text-neutral-600 font-inter">
            This occurs when the pivot chosen is consistently the greatest or smallest element in the array (e.g., if the array is already sorted).
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default FlashcardWidget;
