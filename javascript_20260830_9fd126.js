import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterleavedPractice } from '../hooks/useInterleavedPractice';
import InterleavedSequenceRibbon from '../components/InterleavedSequenceRibbon';
import InterleavedQualityMetrics from '../components/InterleavedQualityMetrics';
import InterleavedRetentionComparison from '../components/InterleavedRetentionComparison';
import InterleavedControls from '../components/InterleavedControls';

const InterleavedPracticeStudio = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('configure'); // 'configure' | 'practice' | 'results'
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [interferenceLevel, setInterferenceLevel] = useState(0.5);
  const [questionCount, setQuestionCount] = useState(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);

  const {
    loading,
    error,
    currentSet,
    sets,
    benefit,
    stats,
    confusablePairs,
    progress,
    createSet,
    submitAnswer,
    loadSets,
    loadStats,
    loadBenefit,
    loadConfusablePairs,
    removeSet,
    isComplete,
    totalQuestions,
    completionPercentage,
  } = useInterleavedPractice();

  // Load initial data
  useEffect(() => {
    loadSets();
    loadStats();
    loadBenefit();
  }, [loadSets, loadStats, loadBenefit]);

  // Handle set generation
  const handleGenerateSet = async () => {
    if (selectedTopics.length < 2) {
      alert('Please select at least 2 topics for interleaving.');
      return;
    }

    try {
      await loadConfusablePairs(selectedTopics);
      const result = await createSet({
        topicIds: selectedTopics,
        interferenceLevel,
        questionCount,
        includeConfusable: true,
        minAccuracyThreshold: 0.6,
      });

      // Extract question details from result
      setMode('practice');
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowFeedback(false);
    } catch (err) {
      alert(err.message || 'Failed to generate practice set.');
    }
  };

  // Handle answer submission
  const handleAnswer = async (questionId, answer, isCorrect) => {
    const result = await submitAnswer(questionId, answer, isCorrect);
    setAnswers(result.answers);
    setShowFeedback(true);

    // Auto-advance after showing feedback
    setTimeout(() => {
      setShowFeedback(false);
      setCurrentQuestionIndex(result.currentIndex);
      
      if (result.currentIndex >= totalQuestions) {
        setMode('results');
      }
    }, 1500);
  };

  // Render configuration mode
  const renderConfigure = () => {
    // Mock topics - in real implementation, fetch from API
    const mockTopics = [
      { id: 't1', name: 'Kinematics', subject: 'Physics' },
      { id: 't2', name: 'Dynamics', subject: 'Physics' },
      { id: 't3', name: 'Thermodynamics', subject: 'Physics' },
      { id: 't4', name: 'Electromagnetism', subject: 'Physics' },
      { id: 't5', name: 'Organic Chemistry', subject: 'Chemistry' },
      { id: 't6', name: 'Inorganic Chemistry', subject: 'Chemistry' },
      { id: 't7', name: 'Calculus', subject: 'Mathematics' },
      { id: 't8', name: 'Statistics', subject: 'Mathematics' },
    ];

    const toggleTopic = (topicId) => {
      setSelectedTopics(prev =>
        prev.includes(topicId)
          ? prev.filter(id => id !== topicId)
          : [...prev, topicId]
      );
    };

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            🎯 Configure Interleaved Practice
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Mix topics to improve long-term retention. Higher interference = more topic switching.
          </p>

          {/* Topics Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Topics (min 2)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {mockTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTopics.includes(topic.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {topic.name}
                  <span className="block text-xs opacity-60">{topic.subject}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {selectedTopics.length} topics selected
            </p>
          </div>

          {/* Interference Level Slider */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interference Level: {(interferenceLevel * 100).toFixed(0)}%
            </label>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-500">Blocked</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={interferenceLevel}
                onChange={(e) => setInterferenceLevel(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-500">Max Interleaved</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0% (Blocked)</span>
              <span>50% (Mixed)</span>
              <span>100% (Max Switch)</span>
            </div>
          </div>

          {/* Question Count */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Questions: {questionCount}
            </label>
            <input
              type="range"
              min="4"
              max="30"
              step="2"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Confusable Pairs Info */}
          {confusablePairs.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                🔄 Confusable Topics Detected
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {confusablePairs.slice(0, 3).map(p => 
                  `${p.topicA} ↔ ${p.topicB}`
                ).join(' • ')}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                These topics will be preferentially paired in your practice.
              </p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateSet}
            disabled={selectedTopics.length < 2 || loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : '🚀 Generate Practice Set'}
          </button>

          {/* Stats */}
          {stats && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Sets</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalSets}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.completedSets}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Interference</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {(stats.averageInterferenceLevel * 100).toFixed(0)}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Switch Rate</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {(stats.averageSwitchRate * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Benefit Section */}
        {benefit && benefit.benefit !== null && (
          <div className="mt-6">
            <InterleavedRetentionComparison
              benefit={benefit}
              onRefresh={loadBenefit}
            />
          </div>
        )}
      </div>
    );
  };

  // Render practice mode
  const renderPractice = () => {
    const questions = currentSet?.questionSequence || [];
    const currentQuestion = questions[currentQuestionIndex];
    const topicSequence = currentSet?.topicSequence || [];

    if (!currentQuestion) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No questions available.</p>
        </div>
      );
    }

    // Mock question data - in real implementation, fetch from API
    const mockQuestions = {
      'q1': { text: 'What is the acceleration due to gravity?', options: ['9.8 m/s²', '8.9 m/s²', '10.2 m/s²', '9.0 m/s²'] },
      'q2': { text: 'What is Newton\'s First Law?', options: ['Inertia', 'F=ma', 'Action-Reaction', 'Gravity'] },
      'q3': { text: 'What is the formula for kinetic energy?', options: ['½mv²', 'mv²', 'mgh', '½mv'] },
    };

    const questionData = mockQuestions[currentQuestion] || mockQuestions['q1'];

    return (
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span>{completionPercentage.toFixed(0)}% complete</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Sequence Ribbon */}
        <div className="mb-6">
          <InterleavedSequenceRibbon
            sequence={topicSequence}
            currentIndex={currentQuestionIndex}
            confusablePairs={confusablePairs}
          />
        </div>

        {/* Quality Metrics */}
        {currentSet && (
          <div className="mb-6">
            <InterleavedQualityMetrics
              switchRate={currentSet.switchRate}
              maxRunLength={currentSet.maxRunLength}
              entropy={currentSet.sequenceEntropy}
              confusableAdjacencyRatio={currentSet.confusableAdjacencyRatio}
              interferenceLevel={currentSet.interferenceLevel}
            />
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="mb-2 text-sm text-blue-600 dark:text-blue-400">
            Topic: {topicSequence[currentQuestionIndex] || 'Unknown'}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {questionData.text}
          </h3>
          <div className="space-y-3">
            {questionData.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!showFeedback) {
                    // In real implementation, check against correct answer
                    const isCorrect = idx === 0; // Mock: first option is correct
                    handleAnswer(currentQuestion, option, isCorrect);
                  }
                }}
                disabled={showFeedback}
                className="w-full text-left px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {String.fromCharCode(65 + idx)}. {option}
              </button>
            ))}
          </div>
          {showFeedback && (
            <div className={`mt-4 p-3 rounded-lg ${answers[currentQuestion]?.isCorrect ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
              {answers[currentQuestion]?.isCorrect ? '✅ Correct!' : '❌ Incorrect. The correct answer was A.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render results mode
  const renderResults = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Practice Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You completed {totalQuestions} questions with {progress.correctCount} correct answers.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {(progress.correctCount / totalQuestions * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Interference</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {(currentSet?.interferenceLevel * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Switch Rate</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {(currentSet?.switchRate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Max Run</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {currentSet?.maxRunLength}
              </p>
            </div>
          </div>

          {/* Quality Metrics */}
          {currentSet && (
            <InterleavedQualityMetrics
              switchRate={currentSet.switchRate}
              maxRunLength={currentSet.maxRunLength}
              entropy={currentSet.sequenceEntropy}
              confusableAdjacencyRatio={currentSet.confusableAdjacencyRatio}
              interferenceLevel={currentSet.interferenceLevel}
              detailed
            />
          )}

          {/* Benefit Comparison */}
          {benefit && (
            <div className="mt-6">
              <InterleavedRetentionComparison benefit={benefit} />
            </div>
          )}

          <div className="mt-6 flex space-x-4 justify-center">
            <button
              onClick={() => setMode('configure')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 New Set
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              📊 Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🔄 Interleaved Practice Studio
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Mix topics to boost long-term retention. Research shows interleaving improves exam performance by up to 40%.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setMode('configure')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'configure'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            ⚙️ Configure
          </button>
          <button
            onClick={() => mode === 'practice' && setMode('practice')}
            disabled={mode !== 'practice'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'practice'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            📝 Practice
          </button>
          <button
            onClick={() => mode === 'results' && setMode('results')}
            disabled={mode !== 'results'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'results'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            📊 Results
          </button>
        </div>

        {/* Main Content */}
        {mode === 'configure' && renderConfigure()}
        {mode === 'practice' && renderPractice()}
        {mode === 'results' && renderResults()}
      </div>
    </div>
  );
};

export default InterleavedPracticeStudio;