/**
 * @fileoverview Tabbed console showing test cases, expected vs actual output diffs, and resource usage.
 * Issue #2200: extended with DiffView and full status-type badges.
 */
import React, { useState } from 'react';
import DiffView from '../coding/DiffView';

const TestResultsConsole = ({ results, isLoading }) => {
    const [activeTab, setActiveTab] = useState('results');

    if (isLoading) {
        return (
            <div className="h-full bg-gray-900 rounded-b-xl border-x border-b border-gray-700 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-400 text-sm">Running test cases...</span>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="h-full bg-gray-900 rounded-b-xl border-x border-b border-gray-700 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Run your code to see test results here.</p>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-900 rounded-b-xl border-x border-b border-gray-700 flex flex-col">
            <div className="flex border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('results')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'results' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Test Results ({results.passed}/{results.total})
                </button>
                <button
                    onClick={() => setActiveTab('resources')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'resources' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Resources
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                {activeTab === 'results' ? (
                    <div className="space-y-4">
                        {results.details.map((detail, idx) => (
                            <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-300">Test Case {detail.testCase}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${detail.passed ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                        {detail.passed ? 'PASSED' : 'FAILED'}
                                    </span>
                                </div>
                                {!detail.passed && (
                                    <div className="space-y-2 mt-2">
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <span className="text-gray-500 block mb-1">Expected:</span>
                                                <pre className="bg-gray-900 p-2 rounded text-green-400">{detail.expected}</pre>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block mb-1">Actual:</span>
                                                <pre className="bg-gray-900 p-2 rounded text-red-400">{detail.actual || 'Empty Output'}</pre>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <span className="text-gray-500 text-xs block mb-1">Visual Diff:</span>
                                            <DiffView expected={detail.expected} actual={detail.actual} />
                                        </div>
                                    </div>
                                )}
                                {detail.error && (
                                    <div className="mt-2">
                                        <span className="text-red-500 text-xs font-semibold">Runtime Error:</span>
                                        <pre className="text-red-400 text-xs mt-1 whitespace-pre-wrap">{detail.error}</pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
                            <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Execution Time</span>
                            <span className="text-2xl font-bold text-blue-400">{results.maxTime}</span>
                            <span className="text-gray-500 text-xs ml-1">/ 2.0s limit</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
                            <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Peak Memory</span>
                            <span className="text-2xl font-bold text-purple-400">{results.maxMemory}</span>
                            <span className="text-gray-500 text-xs ml-1">/ 128MB limit</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestResultsConsole;
