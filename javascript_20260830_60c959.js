import React from 'react';

const InterleavedRetentionComparison = ({ benefit, onRefresh }) => {
  if (!benefit || benefit.benefit === null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Complete more interleaved practice sessions to see retention comparison data.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {benefit?.message || 'Not enough data yet'}
        </p>
      </div>
    );
  }

  const isPositive = benefit.benefit > 0;
  const benefitPercent = (benefit.benefit * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            📈 Interleaving Benefit Analysis
          </h4>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              🔄 Refresh
            </button>
          )}
        </div>

        {/* Benefit Score */}
        <div className="text-center mb-4">
          <div className={`text-4xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? '+' : ''}{benefitPercent}%
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isPositive ? 'Better retention with interleaving' : 'Better retention with blocked practice'}
          </p>
        </div>

        {/* Recommendation */}
        {benefit.recommendations && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 {benefit.recommendations.message}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Recommended Interference Level: {(benefit.recommendations.recommendedLevel * 100).toFixed(0)}%
              {benefit.recommendations.confidence === 'high' && ' (High Confidence)'}
            </p>
          </div>
        )}

        {/* History Chart */}
        {benefit.history && benefit.history.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Benefit by Interference Level
            </p>
            <div className="space-y-2">
              {benefit.history.map((entry, index) => {
                const benefitPct = (entry.benefit * 100).toFixed(1);
                const isPositiveBenefit = entry.benefit > 0;
                const barColor = isPositiveBenefit ? 'bg-green-500' : 'bg-red-500';
                const width = Math.min(100, Math.abs(entry.benefit) * 200);

                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12">
                      {(entry.interferenceLevel * 100).toFixed(0)}%
                    </span>
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${isPositiveBenefit ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositiveBenefit ? '+' : ''}{benefitPct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confidence */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Based on {benefit.history?.length || 0} practice sessions
            </span>
            <span>
              Confidence: {benefit.recommendations?.confidence || 'low'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterleavedRetentionComparison;