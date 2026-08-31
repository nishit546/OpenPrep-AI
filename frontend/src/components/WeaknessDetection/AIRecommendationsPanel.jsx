import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Brain,
  RotateCcw,
  Focus,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  CheckCircle,
} from 'lucide-react';

const typeConfig = {
  study: { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  quiz: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  review: { icon: RotateCcw, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  focus: { icon: Focus, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
};

const priorityConfig = {
  high: { label: 'High Priority', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

const RecommendationCard = ({ recommendation, index }) => {
  const [expanded, setExpanded] = useState(false);
  const type = typeConfig[recommendation.type] || typeConfig.study;
  const priority = priorityConfig[recommendation.priority] || priorityConfig.medium;
  const Icon = type.icon;

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-all hover:shadow-md ${type.bg}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${type.bg} ring-1 ring-gray-200 dark:ring-gray-700`}>
          <Icon className={`w-5 h-5 ${type.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {recommendation.title}
            </h4>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${priority.color}`}>
              {priority.label}
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {recommendation.description}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {recommendation.topicName && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {recommendation.topicName}
              </span>
            )}
            {recommendation.estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{recommendation.estimatedMinutes} min
              </span>
            )}
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Type</p>
              <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                {recommendation.type}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Time</p>
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                {recommendation.estimatedMinutes || '—'} min
              </p>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Priority</p>
              <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                {recommendation.priority}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AIRecommendationsPanel = ({ recommendations = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Sparkles className="w-5 h-5 inline mr-2 text-purple-500" />
          AI Recommendations
        </h3>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-purple-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generating personalized recommendations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Sparkles className="w-5 h-5 inline mr-2 text-purple-500" />
          AI Recommendations
        </h3>
        <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500 opacity-50" />
            <p className="text-sm">No recommendations needed</p>
            <p className="text-xs mt-1">Your performance looks good across all topics!</p>
          </div>
        </div>
      </div>
    );
  }

  // Sort by priority
  const sorted = [...recommendations].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          <Sparkles className="w-5 h-5 inline mr-2 text-purple-500" />
          AI Recommendations
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {recommendations.length} action{recommendations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map((rec, index) => (
          <RecommendationCard
            key={`${rec.topicName}-${index}`}
            recommendation={rec}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default AIRecommendationsPanel;
