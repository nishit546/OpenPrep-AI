import React from 'react';

const StickyNote = ({ children, color = 'yellow', rotation = 'rotate-1', className = '' }) => {
  // Map color names to Tailwind color classes for the sticky note background
  const colorMap = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700',
    blue: 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-700',
    pink: 'bg-pink-100 dark:bg-pink-900 border-pink-200 dark:border-pink-700',
    green: 'bg-emerald-100 dark:bg-emerald-900 border-emerald-200 dark:border-emerald-700',
    purple: 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-700',
  };

  const bgClass = colorMap[color] || colorMap.yellow;

  return (
    <div 
      className={`sticky-note border p-5 rounded-bl-xl ${bgClass} ${rotation} ${className} relative`}
    >
      {/* Tape effect on top center */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/40 dark:bg-black/20 backdrop-blur-sm -rotate-2 rounded-sm shadow-sm" />
      
      {children}
    </div>
  );
};

export default StickyNote;
