/**
 * @fileoverview Main dashboard for syllabus tracking, progress visualization, and mastery updates.
 */
import React, { useState, useEffect } from 'react';
import ProgressSunburst from '../components/Syllabus/ProgressSunburst';
import axios from 'axios';
import SyllabusOverlapMatrix from '../components/Syllabus/SyllabusOverlapMatrix';

const SyllabusTracker = () => {
    const [syllabusText, setSyllabusText] = useState('');
    const [courseName, setCourseName] = useState('');
    const [syllabusData, setSyllabusData] = useState(null);
    const [progressData, setProgressData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const handleCreateSyllabus = async (e) => {
        e.preventDefault();
        if (!syllabusText.trim() || !courseName.trim()) {
            setError('Course name and syllabus text are required.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/syllabus`, {
                text: syllabusText,
                courseName
            });

            if (response.data.success) {
                setSyllabusData(response.data.data);
                // Fetch progress immediately after creation
                const progressRes = await axios.get(`${API_URL}/syllabus/${response.data.data.id}/progress`);
                if (progressRes.data.success) {
                    setProgressData(progressRes.data.data);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to parse syllabus.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMasteryChange = async (subtopicId, newMastery) => {
        try {
            await axios.put(`${API_URL}/syllabus/mastery`, {
                syllabusId: syllabusData.id,
                subtopicId,
                mastery: newMastery
            });

            // Refresh progress data
            const progressRes = await axios.get(`${API_URL}/syllabus/${syllabusData.id}/progress`);
            if (progressRes.data.success) {
                setProgressData(progressRes.data.data);
            }
        } catch (err) {
            console.error('Failed to update mastery:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Syllabus Tracker</h1>
                    <p className="text-gray-600 dark:text-gray-400">Break down your course, track your mastery, and predict your completion date.</p>
                </div>

                {!syllabusData ? (
                    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <form onSubmit={handleCreateSyllabus} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name</label>
                                <input
                                    type="text"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    placeholder="e.g., CS101: Introduction to Computer Science"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paste Syllabus Text</label>
                                <textarea
                                    value={syllabusText}
                                    onChange={(e) => setSyllabusText(e.target.value)}
                                    placeholder="Paste your entire course syllabus or list of topics here..."
                                    rows={10}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Parsing Syllabus...
                                    </>
                                ) : 'Generate Tracker'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Progress Chart */}
                        <div className="lg:col-span-1">
                            {progressData && <ProgressSunburst syllabusData={progressData.syllabus} />}

                            {progressData?.predictedCompletionDate && (
                                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center">
                                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">Predicted Completion</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                        {new Date(progressData.predictedCompletionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Based on your current study velocity</p>
                                </div>
                            )}
                        </div>

                        {/* Right: Syllabus Breakdown */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{syllabusData.courseName}</h2>
                                <button
                                    onClick={() => { setSyllabusData(null); setSyllabusText(''); setCourseName(''); }}
                                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                                >
                                    Reset Syllabus
                                </button>
                            </div>

                            {progressData?.syllabus.map((mod) => (
                                <div key={mod.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                                        {mod.name}
                                    </h3>
                                    <div className="space-y-4">
                                        {mod.topics.map((top) => (
                                            <div key={top.id} className="pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{top.name}</h4>
                                                <div className="space-y-2">
                                                    {top.subtopics.map((sub) => (
                                                        <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{sub.name}</span>
                                                            <select
                                                                value={sub.mastery}
                                                                onChange={(e) => handleMasteryChange(sub.id, e.target.value)}
                                                                className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${sub.mastery === 'mastered' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                                                                        sub.mastery === 'reviewing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                                                            'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                                    }`}
                                                            >
                                                                <option value="not_started">Not Started</option>
                                                                <option value="reviewing">Reviewing</option>
                                                                <option value="mastered">Mastered</option>
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <SyllabusOverlapMatrix />
            </div>
        </div>
    );
};

export default SyllabusTracker;
