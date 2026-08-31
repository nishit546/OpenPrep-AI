import React from 'react';

const InterleavedQualityMetrics = ({
  switchRate,
  maxRunLength,
  entropy,
  confusableAdjacencyRatio,
  interferenceLevel,
  detailed = false,
}) => {
  // Normalize values for display
  const switchPercent = (switchRate * 100).toFixed(0);
  const confusablePercent = (confusableAdjacencyRatio * 100).toFixed(0);
  const interferencePercent = (interferenceLevel * 100).toFixed(0);

  // Determine quality ratings
  const getQualityRating = (value, thresholds) => {
    if (value >= thresholds.good) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400', emoji: '🌟' };
    if (value >= thresholds.medium) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400', emoji: '👍' };
    if (value >= thresholds.fair) return { label: 'Fair', color: 'text-yellow-600 dark:text-yellow-400', emoji: '📊' };
    return { label: 'Needs Improvement', color: 'text-red-600 dark:text-red-400', emoji: '🔄' };
  };

  const switchRating = getQualityRating(switchRate, { good: 0.6, medium: 0.4, fair: 0.2 });
  const runRating = getQualityRating(1 / (maxRunLength || 1), { good: 0.5, medium: 0.3, fair: 0.15 });
  const entropyRating = getQualityRating(entropy / 3, { good: 0.6, medium: 0.4, fair: 0.2 });
  const confusableRating = getQualityRating(confusableAdjacencyRatio, { good: 0.4, medium: 0.2, fair: 0.1 });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          📊 Interleaving Quality Metrics
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Switch Rate */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Switch Rate</p>
            <p className={`text-xl font-bold ${switchRating.color}`}>
              {switchPercent}%
            </p>
            <p className="text-xs text-gray-500">
              {switchRating.emoji} {switchRating.label}
            </p>
            <div className="mt-1 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${switchPercent}%` }}
              />
            </div>
          </div>

          {/* Max Run Length */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Max Run Length</p>
            <p className={`text-xl font-bold ${runRating.color}`}>
              {maxRunLength || 0}
            </p>
            <p className="text-xs text-gray-500">
              {runRating.emoji} {runRating.label}
            </p>
            <div className="mt-1 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full"
                style={{ width: `${Math.min(100, (maxRunLength || 0) * 20)}%` }}
              />
            </div>
          </div>

          {/* Entropy */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Sequence Entropy</p>
            <p className={`text-xl font-bold ${entropyRating.color}`}>
              {entropy?.toFixed(2) || 0}
            </p>
            <p className="text-xs text-gray-500">
              {entropyRating.emoji} {entropyRating.label}
            </p>
            <div className="mt-1 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full"
                style={{ width: `${Math.min(100, (entropy || 0) * 33)}%` }}
              />
            </div>
          </div>

          {/* Confusable Adjacency */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Confusable Pairs</p>
            <p className={`text-xl font-bold ${confusableRating.color}`}>
              {confusablePercent}%
            </p>
            <p className="text-xs text-gray-500">
              {confusableRating.emoji} {confusableRating.label}
            </p>
            <div className="mt-1 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-600 rounded-full"
                style={{ width: `${confusablePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Interference Level Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Interference Level
            </span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {interferencePercent}%
            </span>
          </div>
          <div className="mt-1 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                interferenceLevel > 0.6 ? 'bg-green-600' :
                interferenceLevel > 0.3 ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${interferencePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Blocked</span>
            <span>Mixed</span>
            <span>Max Interleaved</span>
          </div>
        </div>

        {/* Detailed Explanation */}
        {detailed && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              💡 What These Metrics Mean
            </h5>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                <span className="font-medium">Switch Rate:</span> How often topics change. 
                {switchRate > 0.6 ? ' High switching promotes better learning.' :
                 switchRate > 0.3 ? ' Moderate switching is effective.' :
                 ' Low switching resembles blocked practice.'}
              </li>
              <li>
                <span className="font-medium">Max Run Length:</span> Longest streak of same topic.
                {maxRunLength > 4 ? ' Long runs reduce interleaving benefits.' :
                 maxRunLength > 2 ? ' Moderate runs are acceptable.' :
                 ' Short runs are ideal for interleaving.'}
              </li>
              <li>
                <span className="font-medium">Entropy:</span> How distributed topics are.
                {entropy > 1.5 ? ' Well-distributed across topics.' :
                 ' More topic variety would improve interleaving.'}
              </li>
              <li>
                <span className="font-medium">Confusable Pairs:</span> Topics learners confuse.
                {confusableAdjacencyRatio > 0.3 ? ' Good pairing of confusable topics.' :
                 ' Try to include more confusable topic pairs.'}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterleavedQualityMetrics;