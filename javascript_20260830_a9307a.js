import React from 'react';

const HabitRecommendations = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-green-600 dark:text-green-400 text-lg">🎉 No recommendations needed!</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          You're doing great with your habits. Keep it up!
        </p>
      </div>
    );
  }

  const getPriorityEmoji = (priority) => {
    const map = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };
    return map[priority] || '🟡';
  };

  const getPriorityColor = (priority) => {
    const map = {
      high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
      medium: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
      low: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    };
    return map[priority] || 'border-gray-200 bg-gray-50';
  };

  const getTypeLabel = (type) => {
    const map = {
      low_consistency: '🔄 Low Consistency',
      streak_maintenance: '🔥 Streak Maintenance',
      quality_consistency_gap: '📊 Quality-Consistency Gap',
      inactive_habit: '⏰ Inactive Habit',
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-4">
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getPriorityEmoji(rec.priority)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getTypeLabel(rec.type)}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                  {rec.habitName}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                  {rec.priority} priority
                </span>
              </div>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                {rec.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HabitRecommendations;