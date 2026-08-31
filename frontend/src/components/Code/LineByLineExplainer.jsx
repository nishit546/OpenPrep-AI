/**
 * @fileoverview Synchronized code viewer and explanation side panel.
 */
import React, { useState } from 'react';

const LineByLineExplainer = ({ code, analysis, onApplyOptimized }) => {
    const [activeLine, setActiveLine] = useState(null);
    const [showOptimized, setShowOptimized] = useState(false);

    const lines = code.split('\n');

    const getBugSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
            case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
            case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
            default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
        }
    };

    const activeExplanation = analysis.lineExplanations.find(exp => exp.lineNumber === activeLine);
    const activeBugs = analysis.bugs.filter(bug => bug.lineNumber === activeLine);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Code Viewer */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm font-medium text-gray-300">
                        {showOptimized ? 'Optimized Code' : 'Original Code'}
                    </span>
                    {!showOptimized && analysis.optimizedCode && (
                        <button
                            onClick={() => setShowOptimized(true)}
                            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Apply Optimized
                        </button>
                    )}
                    {showOptimized && (
                        <button
                            onClick={() => {
                                setShowOptimized(false);
                                onApplyOptimized(analysis.optimizedCode);
                            }}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Copy to Editor
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                    <pre className="text-gray-300">
                        {(showOptimized ? analysis.optimizedCode : code).split('\n').map((line, idx) => {
                            const lineNumber = idx + 1;
                            const hasBug = analysis.bugs.some(b => b.lineNumber === lineNumber);

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setActiveLine(activeLine === lineNumber ? null : lineNumber)}
                                    className={`flex hover:bg-gray-800 cursor-pointer transition-colors rounded px-2 -mx-2 ${activeLine === lineNumber ? 'bg-gray-800 ring-1 ring-blue-500' : ''
                                        }`}
                                >
                                    <span className={`select-none w-8 text-right mr-4 ${hasBug ? 'text-red-400 font-bold' : 'text-gray-600'}`}>
                                        {lineNumber}
                                    </span>
                                    <span className="flex-1 whitespace-pre-wrap break-all">{line || ' '}</span>
                                </div>
                            );
                        })}
                    </pre>
                </div>
            </div>

            {/* Explanation Side Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Analysis Panel</h3>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {!activeLine ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                            <p>Click on any line of code to see its explanation and check for bugs.</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">Line {activeLine}</p>
                                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 mb-2 bg-white dark:bg-gray-900 p-2 rounded">
                                    {activeExplanation?.code || 'No code found'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {activeExplanation?.explanation || 'No explanation available.'}
                                </p>
                            </div>

                            {activeBugs.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Issues Found</p>
                                    {activeBugs.map((bug, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg border ${getBugSeverityColor(bug.severity)}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold uppercase">{bug.severity} Severity</span>
                                            </div>
                                            <p className="text-sm">{bug.issue}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeBugs.length === 0 && activeExplanation && (
                                <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-sm flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    No issues detected on this line.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LineByLineExplainer;
