import React from 'react';

const ExplainBackGrader = ({ result }) => {
  if (!result) return null;

  const {
    coverageScore,
    jargonDensity,
    simplicityScore,
    avgSentenceLength,
    wordCount,
    technicalTermCount,
    matchedPoints = [],
    missedPoints = [],
    gapFeedback,
    jargonFeedback,
    simplicityFeedback,
    overallFeedback,
    isGoodEnough,
    coverageGrade,
  } = result;

  // Determine color based on score
  const getScoreColor = (score, thresholds = { good: 70, medium: 50 }) => {
    if (score >= thresholds.good) return 'text-green-600 dark:text-green-400';
    if (score >= thresholds.medium) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeEmoji = (grade) => {
    switch (grade) {
      case 'excellent': return '🌟';
      case 'good': return '👍';
      case 'fair': return '📊';
      default: return '🔄';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📊 Analysis Results
        </h3>
        {isGoodEnough && (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
            ✅ Good Enough!
          </span>
        )}
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Coverage</p>
          <p className={`text-2xl font-bold ${getScoreColor(coverageScore)}`}>
            {coverageScore.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400">
            {getGradeEmoji(coverageGrade)} {coverageGrade}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Jargon Density</p>
          <p className={`text-2xl font-bold ${getScoreColor(100 - jargonDensity, { good: 85, medium: 70 })}`}>
            {jargonDensity.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400">
            {jargonDensity < 20 ? '✅ Low' : jargonDensity < 40 ? '📊 Medium' : '⚠️ High'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Simplicity</p>
          <p className={`text-2xl font-bold ${getScoreColor(simplicityScore)}`}>
            {simplicityScore.toFixed(0)}
          </p>
          <p className="text-xs text-gray-400">
            {simplicityScore >= 70 ? '✅ Simple' : simplicityScore >= 50 ? '📊 Moderate' : '⚠️ Complex'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Word Count</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {wordCount}
          </p>
          <p className="text-xs text-gray-400">
            {technicalTermCount} tech terms
          </p>
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="space-y-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
            📋 Coverage
          </h4>
          <p className="text-blue-700 dark:text-blue-300 text-sm whitespace-pre-wrap">
            {gapFeedback}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-1">
            🗣️ Language
          </h4>
          <p className="text-purple-700 dark:text-purple-300 text-sm">
            {jargonFeedback}
          </p>
          <p className="text-purple-700 dark:text-purple-300 text-sm mt-1">
            {simplicityFeedback}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="font-medium text-green-800 dark:text-green-300 mb-1">
            📈 Overall Assessment
          </h4>
          <p className="text-green-700 dark:text-green-300 text-sm whitespace-pre-wrap">
            {overallFeedback}
          </p>
        </div>
      </div>

      {/* Matched vs Missed Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchedPoints.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
              ✅ Covered ({matchedPoints.length})
            </h4>
            <ul className="space-y-1">
              {matchedPoints.slice(0, 10).map((point, index) => (
                <li key={index} className="text-sm text-green-700 dark:text-green-300 flex items-start">
                  <span className="mr-2">•</span>
                  {point}
                </li>
              ))}
              {matchedPoints.length > 10 && (
                <li className="text-sm text-green-600 dark:text-green-400">+ {matchedPoints.length - 10} more</li>
              )}
            </ul>
          </div>
        )}

        {missedPoints.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
              ❌ Missed ({missedPoints.length})
            </h4>
            <ul className="space-y-1">
              {missedPoints.slice(0, 10).map((point, index) => (
                <li key={index} className="text-sm text-red-700 dark:text-red-300 flex items-start">
                  <span className="mr-2">•</span>
                  {point}
                </li>
              ))}
              {missedPoints.length > 10 && (
                <li className="text-sm text-red-600 dark:text-red-400">+ {missedPoints.length - 10} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Try Again
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          🖨️ Print Feedback
        </button>
      </div>
    </div>
  );
};

export default ExplainBackGrader;