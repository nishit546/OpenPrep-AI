import React, { useState, useEffect } from 'react';
import { useHabitTracking } from '../hooks/useHabitTracking';
import HabitStreakCard from '../components/HabitStreakCard';
import HabitConsistencyChart from '../components/HabitConsistencyChart';
import HabitCategoryAnalytics from '../components/HabitCategoryAnalytics';
import HabitWeeklySummary from '../components/HabitWeeklySummary';
import HabitRecommendations from '../components/HabitRecommendations';

const HabitTrackingDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedHabit, setSelectedHabit] = useState(null);

  const {
    loading,
    error,
    habits,
    analytics,
    weeklySummary,
    recommendations,
    todayStatus,
    loadHabits,
    loadAnalytics,
    loadWeeklySummary,
    loadRecommendations,
    loadTodayStatus,
    logHabitCompletion,
    useFreeze,
    hasHabits,
    totalHabits,
    activeHabits,
  } = useHabitTracking();

  // Load all data on mount
  useEffect(() => {
    const loadAll = async () => {
      await loadHabits({ isActive: true });
      await loadAnalytics();
      await loadWeeklySummary();
      await loadRecommendations();
      await loadTodayStatus();
    };
    loadAll();
  }, []);

  // Handle habit completion
  const handleCompleteHabit = async (habitId, data = {}) => {
    try {
      await logHabitCompletion(habitId, data);
      // Refresh data
      await loadTodayStatus();
      await loadHabits({ isActive: true });
      await loadAnalytics();
    } catch (err) {
      alert(err.message || 'Failed to log habit completion');
    }
  };

  // Handle streak freeze
  const handleUseFreeze = async (habitId) => {
    if (!confirm('Use a streak freeze for today? This will protect your streak.')) return;
    try {
      await useFreeze(habitId);
      await loadHabits({ isActive: true });
      await loadAnalytics();
      await loadTodayStatus();
    } catch (err) {
      alert(err.message || 'Failed to use streak freeze');
    }
  };

  if (loading && !hasHabits) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📚 Habit Tracking
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Build consistent study habits. Track your streaks, consistency, and progress.
          </p>
        </div>

        {/* Stats Overview */}
        {hasHabits && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Habits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeHabits}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Habits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHabits}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Today's Progress</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {todayStatus?.completedCount || 0}/{todayStatus?.totalCount || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Consistency</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {analytics?.averageConsistency?.toFixed(0) || 0}%
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'habits'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            📋 My Habits
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            📈 Analytics
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            💡 Recommendations {recommendations.length > 0 && `(${recommendations.length})`}
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Today's Status */}
              {todayStatus && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📅 Today's Habits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todayStatus.habits.map((habit) => (
                      <div
                        key={habit.habitId}
                        className={`p-4 rounded-lg border ${
                          habit.completed
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {habit.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              🔥 {habit.streak} day streak
                            </p>
                          </div>
                          <button
                            onClick={() => handleCompleteHabit(habit.habitId)}
                            disabled={habit.completed}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              habit.completed
                                ? 'bg-green-500 text-white cursor-default'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {habit.completed ? '✅ Done' : 'Complete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Streak Cards */}
              {habits.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {habits.slice(0, 6).map((habit) => (
                    <HabitStreakCard
                      key={habit.id}
                      habit={habit}
                      onComplete={() => handleCompleteHabit(habit.id)}
                      onFreeze={() => handleUseFreeze(habit.id)}
                    />
                  ))}
                </div>
              )}

              {/* Weekly Summary */}
              {weeklySummary && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📊 Weekly Summary
                  </h3>
                  <HabitWeeklySummary summary={weeklySummary} />
                </div>
              )}
            </>
          )}

          {activeTab === 'habits' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  📋 All Habits
                </h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  + New Habit
                </button>
              </div>
              <div className="space-y-3">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {habit.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>🔥 {habit.currentStreak || 0} day streak</span>
                        <span>📈 {habit.consistencyScore?.toFixed(0) || 0}% consistency</span>
                        <span>🏆 {habit.totalCompletions || 0} completions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCompleteHabit(habit.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Log
                      </button>
                      <button className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <>
              {/* Consistency Chart */}
              {analytics && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📈 Consistency & Trends
                  </h3>
                  <HabitConsistencyChart analytics={analytics} />
                </div>
              )}

              {/* Category Analytics */}
              {analytics?.categories && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📊 Category Breakdown
                  </h3>
                  <HabitCategoryAnalytics categories={analytics.categories} />
                </div>
              )}
            </>
          )}

          {activeTab === 'recommendations' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 Personalized Recommendations
              </h3>
              <HabitRecommendations recommendations={recommendations} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HabitTrackingDashboard;