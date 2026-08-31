/**
 * @fileoverview Main page for the interactive code snippet explainer and debugger.
 */
import React, { useState } from 'react';
import LineByLineExplainer from '../components/Code/LineByLineExplainer';
import axios from 'axios';

const CodeDebuggerTool = () => {
    const [code, setCode] = useState(`def calculate_factorial(n):
    if n == 0:
        return 1
    result = 1
    for i in range(1, n + 1):
        result = result * i
    return result

print(calculate_factorial(5))`);
    const [language, setLanguage] = useState('python');
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const handleAnalyze = async () => {
        if (!code.trim()) {
            setError('Please enter some code to analyze.');
            return;
        }

        setIsLoading(true);
        setError('');
        setAnalysis(null);

        try {
            const response = await axios.post(`${API_URL}/code-debugger/analyze`, { code, language });
            if (response.data.success) {
                setAnalysis(response.data.data);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to analyze code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyOptimized = (optimizedCode) => {
        setCode(optimizedCode);
        setAnalysis(null); // Reset analysis to re-analyze the new code if desired
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Code Explainer & Debugger</h1>
                    <p className="text-gray-600 dark:text-gray-400">Paste your code to get line-by-line explanations, bug detection, and optimization suggestions.</p>
                </div>

                {/* Input Area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                        </select>
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading}
                            className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing...
                                </>
                            ) : 'Analyze Code'}
                        </button>
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full h-40 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Paste your code here..."
                        spellCheck="false"
                    />
                    {error && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}
                </div>

                {/* Results Area */}
                {analysis ? (
                    <div className="flex-1 min-h-0">
                        <LineByLineExplainer
                            code={code}
                            analysis={analysis}
                            onApplyOptimized={handleApplyOptimized}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Analysis results will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeDebuggerTool;
