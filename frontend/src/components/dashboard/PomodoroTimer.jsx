import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            setIsActive(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  // Calculate progress for the circular ring (0 to 100)
  const progress = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

  return (
    <div className="bg-gradient-to-br from-yellow-700 to-yellow-900 p-6 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_2px_10px_rgba(255,255,255,0.2)] border-4 border-yellow-600 relative overflow-hidden flex flex-col items-center justify-center w-64 h-64 mx-auto group">
      {/* Inner Metallic Bezel */}
      <div className="absolute inset-2 rounded-full border-4 border-yellow-800 shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] pointer-events-none" />
      
      {/* Dial background */}
      <div className="absolute inset-4 rounded-full bg-vintage-paper shadow-inner flex flex-col items-center justify-center">
        
        {/* Decorative ticks */}
        <div className="absolute inset-0 rounded-full border-[10px] border-dashed border-neutral-400/30 pointer-events-none" />

        <Clock className="w-6 h-6 text-yellow-800 mb-2 opacity-50" />
        
        <h3 className="font-playfair font-bold text-4xl text-neutral-900 dark:text-white tracking-wider">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </h3>
        <p className="text-xs text-neutral-500 font-bold tracking-widest mt-1 uppercase">Focus</p>

        {/* Controls */}
        <div className="flex space-x-4 mt-4 z-10">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTimer}
            aria-label={isActive ? 'Pause timer' : 'Start timer'}
            className="w-10 h-10 rounded-full bg-yellow-700 text-yellow-50 flex items-center justify-center shadow-md border border-yellow-600"
          >
            {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={resetTimer}
            aria-label="Reset timer"
            className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center shadow-md border border-neutral-300 dark:border-slate-600"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Progress Indicator (SVG Circle) */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
        <circle 
          cx="50" cy="50" r="46" 
          fill="none" 
          stroke="rgba(0,0,0,0.1)" 
          strokeWidth="4" 
        />
        <circle 
          cx="50" cy="50" r="46" 
          fill="none" 
          stroke="#D4AF37" 
          strokeWidth="4" 
          strokeLinecap="round"
          strokeDasharray="289" /* 2 * PI * 46 ≈ 289 */
          strokeDashoffset={289 - (progress / 100) * 289}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>

    </div>
  );
};

export default PomodoroTimer;
