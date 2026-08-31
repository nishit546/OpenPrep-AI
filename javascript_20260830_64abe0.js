import React from 'react';

const HabitStreakCard = ({ habit, onComplete, onFreeze }) => {
  const {
    id,
    name,
    category,
    currentStreak,
    longestStreak,
    consistencyScore,
    totalCompletions,
    color = '#3B82F6',
  } = habit;

  // Get emoji for category
  const getCategoryEmoji = (cat) => {
    const map = {
      study: '📚',
      review: '🔄',
      practice: '✍️',
      reading: '📖',
      writing: '📝',
      coding: '💻',
      language: '🌍',
      math: '📐',
      science: '🔬',
      other: '📌',
    };
    return map[cat] || '📌';
  };

  // Get status color
  const getStatusColor = () => {
    if (currentStreak >= 30) return 'text-purple-600 dark:text-purple-400';
    if (currentStreak >= 14) return 'text-blue-600 dark:text-blue-400';
    if (currentStreak >= 7) return 'text-green-600 dark:text-green-400';
    if (currentStreak >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getCategoryEmoji(category)}</span>
            <h4 className="font-medium text-gray-900 dark:text-white">{name}</h4>
          </div>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
            <p className={`text-xl font-bold ${getStatusColor()}`}>
              🔥 {currentStreak || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Best</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {longestStreak || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Consistency</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {consistencyScore?.toFixed(0) || 0}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {totalCompletions || 0} completions
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onComplete(id)}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Log
            </button>
            <button
              onClick={() => onFreeze(id)}
              className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
            >
              ❄️ Freeze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitStreakCard;