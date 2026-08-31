import React, { useState, useEffect } from 'react';

const SectionalTimer = ({ durationMinutes, activeSection, onSectionExpired, onTimeUpdate, initialTimeLeft }) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft || durationMinutes * 60);

  useEffect(() => {
    // Sync time left when activeSection changes (unless initialTimeLeft is provided)
    if (initialTimeLeft === undefined) {
      setTimeLeft(durationMinutes * 60);
    } else {
      setTimeLeft(initialTimeLeft);
    }
  }, [activeSection, durationMinutes, initialTimeLeft]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onSectionExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;
        if (onTimeUpdate) {
          onTimeUpdate(nextTime);
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onSectionExpired, onTimeUpdate]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Warn user if less than 5 minutes remaining
  const isUrgent = timeLeft < 300;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
      isUrgent
        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 animate-pulse'
        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
    }`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Time Remaining</span>
        <span className="text-lg font-bold font-mono leading-none mt-0.5">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );
};

export default SectionalTimer;
