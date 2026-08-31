/**
 * @fileoverview Main page for the Automated Accessibility and Readability Enhancer.
 */
import React, { useState } from 'react';
import TextSimplifier from '../components/Accessibility/TextSimplifier';
import axios from 'axios';

const AccessibilityEnhancer = () => {
    const [text, setText] = useState('');
    const [enhancedData, setEnhancedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const handleEnhance = async (inputText, readingLevel) => {
        setIsLoading(true);
        setError('');
        setEnhancedData(null);

        try {
            const response = await axios.post(`${API_URL}/accessibility/enhance`, {
                text: inputText,
                readingLevel
            });

            if (response.data.success) {
                setEnhancedData(response.data.data);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to enhance text. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Readability Enhancer</h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Make dense academic materials accessible. Simplify complex jargon, generate plain-English summaries, and create audio-friendly scripts for diverse learning needs.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Paste Academic Text or Notes
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g., The mitochondria is the powerhouse of the cell, generating most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy through oxidative phosphorylation..."
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    {error && (
                        <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>
                    )}
                </div>

                <TextSimplifier
                    originalText={text}
                    enhancedData={enhancedData}
                    isLoading={isLoading}
                    onEnhance={handleEnhance}
                />
            </div>
        </div>
    );
};

export default AccessibilityEnhancer;
