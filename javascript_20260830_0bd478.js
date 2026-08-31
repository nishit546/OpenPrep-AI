import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExplainBack } from '../hooks/useExplainBack';
import ExplainBackGrader from '../components/ExplainBackGrader';
import ExplainBackHistory from '../components/ExplainBackHistory';
import ExplainBackCoverageChart from '../components/ExplainBackCoverageChart';

const ExplainBackStudio = () => {
  const { conceptId } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState('write'); // 'write' | 'review' | 'history'
  const [explanation, setExplanation] = useState('');
  const [keyPoints, setKeyPoints] = useState([]);
  const [sourceType, setSourceType] = useState('topic');
  const [sourceId, setSourceId] = useState(null);
  const [customKeyPoints, setCustomKeyPoints] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultData, setResultData] = useState(null);
  const textareaRef = useRef(null);
  const timerRef = useRef(null);
  const [timeSpent, setTimeSpent] = useState(0);

  const {
    loading,
    error,
    attempts,
    bestAttempt,
    progress,
    submitAttempt,
    analyze,
    extractPoints,
    loadConceptData,
  } = useExplainBack(conceptId);

  // Timer for time spent writing
  useEffect(() => {
    if (mode === 'write' && explanation.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [mode, explanation]);

  const handleAnalyze = async () => {
    if (explanation.trim().length < 5) {
      alert('Please write at least 5 characters before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const points = keyPoints.length > 0 
        ? keyPoints 
        : customKeyPoints.split('\n').filter(p => p.trim());

      if (points.length === 0) {
        alert('Please add at least one key point for analysis.');
        setIsAnalyzing(false);
        return;
      }

      const result = await analyze({
        keyPoints: points,
        explanation,
        technicalTerms: [],
      });

      setResultData(result);
      setShowResults(true);
      setMode('review');
    } catch (err) {
      alert(err.message || 'Failed to analyze explanation.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!conceptId) {
      alert('Concept ID is required. Please select a concept.');
      return;
    }

    try {
      const points = keyPoints.length > 0 
        ? keyPoints 
        : customKeyPoints.split('\n').filter(p => p.trim());

      const result = await submitAttempt({
        conceptId,
        sourceType,
        sourceId,
        explanation,
        customKeyPoints: points.length > 0 ? points : undefined,
        timeSpent: timeSpent > 10 ? timeSpent : undefined,
      });

      setResultData(result.analysis);
      setShowResults(true);
      setMode('review');
      await loadConceptData(conceptId);
    } catch (err) {
      alert(err.message || 'Failed to submit attempt.');
    }
  };

  const handleExtractPoints = async () => {
    if (!customKeyPoints || customKeyPoints.length < 10) {
      alert('Please enter some text to extract key points from.');
      return;
    }

    try {
      const result = await extractPoints(customKeyPoints);
      if (result.keyPoints && result.keyPoints.length > 0) {
        setKeyPoints(result.keyPoints);
        alert(`Extracted ${result.count} key points successfully!`);
      } else {
        alert('No key points could be extracted. Please enter key points manually.');
      }
    } catch (err) {
      alert(err.message || 'Failed to extract key points.');
    }
  };

  const handleReset = () => {
    setExplanation('');
    setShowResults(false);
    setResultData(null);
    setMode('write');
    setTimeSpent(0);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleNewAttempt = () => {
    handleReset();
    navigate(`/explain-back/concept/${conceptId}`);
  };

  if (loading && attempts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🧠 Feynman Explain-Back Studio
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Explain a concept in plain language, and we'll tell you what you missed.
          The Feynman technique: if you can't explain it simply, you don't understand it well enough.
        </p>
      </div>

      {/* Stats Bar */}
      {attempts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Attempts</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{attempts.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Best Coverage</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {bestAttempt?.coverageScore?.toFixed(1) || 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Version</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              v{attempts.length + 1}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Jargon Density</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {bestAttempt?.jargonDensity?.toFixed(1) || 0}%
            </p>
          </div>
        </div>
      )}

      {/* Progress Chart */}
      {progress.length > 1 && (
        <div className="mb-8">
          <ExplainBackCoverageChart data={progress} />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Writing Area */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              {/* Mode Tabs */}
              <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <button
                  onClick={() => setMode('write')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'write'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  ✏️ Write
                </button>
                <button
                  onClick={() => setMode('history')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'history'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  📜 History
                </button>
                {showResults && (
                  <button
                    onClick={() => setMode('review')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mode === 'review'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    📊 Results
                  </button>
                )}
              </div>

              {/* Write Mode */}
              {mode === 'write' && (
                <div>
                  {/* Key Points Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Key Points to Cover
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={customKeyPoints}
                        onChange={(e) => setCustomKeyPoints(e.target.value)}
                        placeholder="Enter key points (one per line) or paste source text"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        onClick={handleExtractPoints}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Extract
                      </button>
                    </div>
                    {keyPoints.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {keyPoints.map((point, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                          >
                            {point}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Explanation Textarea */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Write your explanation here... Explain it like you're teaching a beginner."
                      className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    />
                    <div className="absolute bottom-3 right-3 text-sm text-gray-500 dark:text-gray-400">
                      {explanation.length} chars • {timeSpent}s
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || explanation.length < 5}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? 'Analyzing...' : '🔍 Analyze'}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!conceptId || explanation.length < 5}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💾 Submit Attempt
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Review Mode */}
              {mode === 'review' && resultData && (
                <div className="space-y-6">
                  <ExplainBackGrader result={resultData} />
                </div>
              )}

              {/* History Mode */}
              {mode === 'history' && (
                <ExplainBackHistory
                  attempts={attempts}
                  onSelect={(attempt) => {
                    setResultData({
                      coverageScore: attempt.coverageScore,
                      jargonDensity: attempt.jargonDensity,
                      simplicityScore: attempt.simplicityScore,
                      matchedPoints: attempt.matchedPoints,
                      missedPoints: attempt.missedPoints,
                      overallFeedback: attempt.aiFeedback || attempt.overallFeedback,
                      wordCount: attempt.wordCount,
                      technicalTermCount: attempt.technicalTermCount,
                    });
                    setShowResults(true);
                    setMode('review');
                  }}
                  onDelete={async (id) => {
                    if (window.confirm('Delete this attempt?')) {
                      await removeAttempt(id);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📋 Concept Info
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Concept ID</p>
                <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                  {conceptId || 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {attempts.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Best Coverage</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {bestAttempt?.coverageScore?.toFixed(1) || 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Version</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  v{attempts.length + 1}
                </p>
              </div>
            </div>

            <hr className="my-4 border-gray-200 dark:border-gray-700" />

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              💡 Tips
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• Explain like you're teaching a beginner</li>
              <li>• Use simple, everyday language</li>
              <li>• Cover all key points naturally</li>
              <li>• Don't just recite vocabulary</li>
            </ul>

            <button
              onClick={handleNewAttempt}
              className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🚀 New Attempt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplainBackStudio;