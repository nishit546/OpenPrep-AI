/**
 * @fileoverview Component for viewing side-by-side original vs. simplified text with TTS support.
 */
import React, { useState, useEffect } from 'react';

const TextSimplifier = ({ originalText, enhancedData, isLoading, onEnhance }) => {
    const [readingLevel, setReadingLevel] = useState('high_school');
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        // Cleanup TTS on unmount
        return () => {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        };
    }, []);

    const handleEnhance = () => {
        if (originalText.trim().length >= 50) {
            onEnhance(originalText, readingLevel);
        }
    };

    const handleTTS = () => {
        if (!enhancedData?.audioScript) return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(enhancedData.audioScript);
            utterance.rate = 0.9; // Slightly slower for better comprehension
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Reading Level</label>
                    <select
                        value={readingLevel}
                        onChange={(e) => setReadingLevel(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="layman">Layman (Beginner)</option>
                        <option value="high_school">High School</option>
                        <option value="undergraduate">Undergraduate</option>
                    </select>
                </div>
                <button
                    onClick={handleEnhance}
                    disabled={isLoading || originalText.trim().length < 50}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Enhance Readability'}
                </button>
            </div>

            {/* Side-by-Side View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Original Text
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{originalText || 'Paste your dense academic text here...'}</p>
                </div>

                {/* Enhanced */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 relative">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Enhanced Version
                        </h3>
                        {enhancedData && (
                            <button
                                onClick={handleTTS}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${isSpeaking
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                    }`}
                            >
                                {isSpeaking ? '⏹ Stop Audio' : '🔊 Generate Audio Summary'}
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                        </div>
                    ) : enhancedData ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{enhancedData.simplifiedText}</p>

                            {enhancedData.glossary && enhancedData.glossary.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Simplified Glossary</h4>
                                    <ul className="space-y-2">
                                        {enhancedData.glossary.map((item, idx) => (
                                            <li key={idx} className="text-sm">
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">{item.term}:</span>{' '}
                                                <span className="text-gray-700 dark:text-gray-300">{item.simpleDefinition}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Enhanced text will appear here.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TextSimplifier;
