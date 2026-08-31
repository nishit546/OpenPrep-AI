import React from 'react';

const InterleavedControls = ({
  onGenerate,
  onReset,
  loading,
  disabled,
  children,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Generate Button */}
        <button
          onClick={onGenerate}
          disabled={disabled || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⟳</span>
              Generating...
            </>
          ) : (
            '🚀 Generate Set'
          )}
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          disabled={loading}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Reset
        </button>

        {/* Custom Controls */}
        {children}

        {/* Quick Stats */}
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            ⚡ Interference: {disabled ? 'N/A' : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InterleavedControls;