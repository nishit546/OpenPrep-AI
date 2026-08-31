import React, { useState, useEffect } from 'react';
import LeitnerBoxVisualizer from '../components/flashcards/LeitnerBoxVisualizer';
import ReviewLoadForecast from '../components/flashcards/ReviewLoadForecast';
import ForgettingCurveChart from '../components/Analytics/ForgettingCurveChart';
import axios from 'axios';
import { getLeitnerDistribution, getDueForecast } from '../services/api';


const SpacedRepetitionDashboard = () => {
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [leitnerData, setLeitnerData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [queueRes, analyticsRes, leitnerRes, forecastRes] = await Promise.all([
                    axios.get(`${API_URL}/spaced-repetition/queue`).catch(() => ({ data: { success: false } })),
                    axios.get(`${API_URL}/spaced-repetition/analytics`).catch(() => ({ data: { success: false } })),
                    getLeitnerDistribution().catch(() => ({ data: { success: false } })),
                    getDueForecast().catch(() => ({ data: { success: false } })),
                ]);

                if (queueRes.data && queueRes.data.success) setQueue(queueRes.data.data.queue);
                if (analyticsRes.data && analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
                if (leitnerRes.data && leitnerRes.data.success) setLeitnerData(leitnerRes.data.data);
                if (forecastRes.data && forecastRes.data.success) setForecastData(forecastRes.data.data);
            } catch (error) {
                console.error('Failed to fetch SR data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);


    const handleDifficultySubmit = async (rating) => {
        const currentItem = queue[currentIndex];
        try {
            await axios.post(`${API_URL}/spaced-repetition/review`, {
                itemId: currentItem.id,
                difficultyRating: rating
            });

            // Move to next item
            setShowAnswer(false);
            if (currentIndex < queue.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // Queue completed, refresh data
                const queueRes = await axios.get(`${API_URL}/spaced-repetition/queue`);
                setQueue(queueRes.data.data.queue);
                setCurrentIndex(0);
            }
        } catch (error) {
            console.error('Failed to submit review:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const currentItem = queue[currentIndex];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Spaced Repetition Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Optimize your memory retention with predictive scheduling.</p>
                </div>

                {/* Leitner Box Visualizer Stage */}
                <LeitnerBoxVisualizer boxes={leitnerData?.boxes} />

                {/* 30-Day Review Forecast Graph */}
                <ReviewLoadForecast forecastData={forecastData} />

                {/* Analytics Section */}
                <ForgettingCurveChart data={analytics} />


                {/* Review Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                    {queue.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🎉</div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h2>
                            <p className="text-gray-600 dark:text-gray-400">You have no items due for review today. Great job maintaining your retention!</p>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto text-center">
                            <div className="mb-6">
                                <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold mb-4">
                                    Card {currentIndex + 1} of {queue.length}
                                </span>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{currentItem.content}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Predicted Retention: <span className="font-semibold text-red-500">{(currentItem.retentionProbability * 100).toFixed(0)}%</span>
                                </p>
                            </div>

                            {!showAnswer ? (
                                <button
                                    onClick={() => setShowAnswer(true)}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-md"
                                >
                                    Show Answer
                                </button>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <p className="text-lg text-gray-800 dark:text-gray-200">
                                            {/* Mock answer for demonstration */}
                                            This is the detailed answer and explanation for "{currentItem.content}".
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">How difficult was this?</p>
                                        <div className="flex flex-wrap justify-center gap-3">
                                            <button onClick={() => handleDifficultySubmit(1)} className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-800 dark:text-red-300 rounded-lg font-medium transition-colors">
                                                1 - Again
                                            </button>
                                            <button onClick={() => handleDifficultySubmit(2)} className="px-4 py-2 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-300 rounded-lg font-medium transition-colors">
                                                2 - Hard
                                            </button>
                                            <button onClick={() => handleDifficultySubmit(3)} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-lg font-medium transition-colors">
                                                3 - Good
                                            </button>
                                            <button onClick={() => handleDifficultySubmit(4)} className="px-4 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-800 dark:text-green-300 rounded-lg font-medium transition-colors">
                                                4 - Easy
                                            </button>
                                            <button onClick={() => handleDifficultySubmit(5)} className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded-lg font-medium transition-colors">
                                                5 - Perfect
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpacedRepetitionDashboard;
