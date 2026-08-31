/**
 * @fileoverview Floating tooltip component triggered by text selection, showing AI-generated definitions.
 */
import React, { useState, useEffect } from 'react';

const InlineGlossaryTooltip = ({ selection, onClose }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        if (selection) {
            const rect = selection.range.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 10,
                left: rect.left + window.scrollX
            });

            const fetchDefinition = async () => {
                try {
                    const response = await fetch(`${API_URL}/glossary/define`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            term: selection.text,
                            context: selection.context
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        setData(result.data);
                    }
                } catch (error) {
                    console.error('Failed to fetch definition:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchDefinition();
        }
    }, [selection]);

    const handleSave = async () => {
        try {
            const response = await fetch(`${API_URL}/glossary/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    term: selection.text,
                    definition: data.definition,
                    relatedConcepts: data.relatedConcepts,
                    exampleSentence: data.exampleSentence,
                    subject: 'General' // In production, derive from current note's subject
                })
            });
            if (response.ok) {
                setIsSaved(true);
                setTimeout(onClose, 1000);
            }
        } catch (error) {
            console.error('Failed to save term:', error);
        }
    };

    if (!selection) return null;

    return (
        <div
            className="fixed z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in"
            style={{ top: position.top, left: position.left }}
        >
            <button
                onClick={onClose}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 capitalize">{selection.text}</h4>

            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-4">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating definition...
                </div>
            ) : data ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.definition}</p>

                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Related Concepts</p>
                        <div className="flex flex-wrap gap-1">
                            {data.relatedConcepts.map((concept, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                    {concept}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Example</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{data.exampleSentence}"</p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaved}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isSaved
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {isSaved ? (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved to Glossary</>
                        ) : (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> Save to Glossary</>
                        )}
                    </button>
                </div>
            ) : (
                <p className="text-sm text-red-500">Failed to load definition.</p>
            )}
        </div>
    );
};

export default InlineGlossaryTooltip;
