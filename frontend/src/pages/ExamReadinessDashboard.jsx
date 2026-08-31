/**
 * @fileoverview Main dashboard for exam readiness prediction and gap analysis.
 */
import React, { useState, useEffect } from 'react';
import ReadinessGauge from '../components/Analytics/ReadinessGauge';
import axios from 'axios';

const ExamReadinessDashboard = () => {
    const [targetScore, setTargetScore] = useState(80);
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchAnalysis();
    }, [targetScore]);

    const fetchAnalysis = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_URL}/readiness/analysis?targetScore=${targetScore}`);
            if (response.data.success) {
                setAnalysis(response.data.data);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError('Failed to fetch readiness analysis. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exam Readiness Predictor</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        AI-driven insights to help you understand your current standing and what to focus on next.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-center">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Left: Gauge and Target Input */}
                    <div className="space-y-6">
                        <ReadinessGauge
                            score={analysis.readinessScore}
                            confidenceLevel={analysis.confidenceLevel}
                        />

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Target Exam Score: <span className="font-bold text-blue-600 dark:text-blue-400">{targetScore}%</span>
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="100"
                                value={targetScore}
                                onChange={(e) => setTargetScore(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Gap Analysis and Weak Areas */}
                    <div className="space-y-6">
                        {/* Gap Analysis Card */}
                        <div className={`p-6 rounded-2xl border shadow-sm ${analysis.gapAnalysis.isAchievable
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                            }`}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Gap Analysis</h3>
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-700 dark:text-gray-300">
                                    Current Gap: <span className="font-bold">{analysis.gapAnalysis.scoreGap} points</span>
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Estimated Study Time Needed: <span className="font-bold">{analysis.gapAnalysis.estimatedHoursNeeded} hours</span>
                                </p>
                                <p className={`font-semibold ${analysis.gapAnalysis.isAchievable ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
                                    }`}>
                                    {analysis.gapAnalysis.isAchievable
                                        ? '✓ This target is highly achievable with focused study!'
                                        : '⚠ This target is ambitious. Consider adjusting or increasing study time.'}
                                </p>
                            </div>
                        </div>

                        {/* Last-Minute Study Checklist */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Top 3 Critical Weak Areas
                            </h3>
                            <ul className="space-y-3">
                                {analysis.weakAreas.map((area, index) => (
                                    <li key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
                                            {index + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{area.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Current proficiency: {area.score}% • Potential improvement: +{area.potentialImprovement}%
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamReadinessDashboard;
