import React from 'react';

const InterleavedSequenceRibbon = ({ sequence, currentIndex, confusablePairs = [] }) => {
  if (!sequence || sequence.length === 0) {
    return null;
  }

  // Get color for topic
  const getTopicColor = (topicId, index) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-rose-500',
    ];
    return colors[index % colors.length];
  };

  // Check if two topics are confusable
  const areConfusable = (topicA, topicB) => {
    if (!topicA || !topicB) return false;
    const key = [topicA, topicB].sort().join('-');
    return confusablePairs.some(p => {
      const pairKey = [p.topicA, p.topicB].sort().join('-');
      return pairKey === key;
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Topic Sequence
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {sequence.length} questions • 
          {new Set(sequence).size} topics
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {sequence.map((topicId, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const isNext = index === currentIndex + 1;
          const isConfusable = index > 0 && areConfusable(sequence[index - 1], topicId);

          // Determine styling
          let className = 'px-2 py-1 rounded text-xs font-medium transition-all ';
          
          if (isCurrent) {
            className += 'ring-2 ring-offset-2 ring-blue-500 scale-110 ';
          }
          
          if (isPast) {
            className += 'opacity-50 ';
          }

          const colorClass = getTopicColor(topicId, index);

          return (
            <div
              key={index}
              className={`${className} ${colorClass} text-white`}
              title={`Position ${index + 1}: ${topicId}`}
            >
              {index + 1}
              {isConfusable && (
                <span className="ml-1 text-xs opacity-70">🔄</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></span>
          Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          Next
        </span>
        <span className="flex items-center gap-1">
          🔄 Confusable pair
        </span>
      </div>
    </div>
  );
};

export default InterleavedSequenceRibbon;