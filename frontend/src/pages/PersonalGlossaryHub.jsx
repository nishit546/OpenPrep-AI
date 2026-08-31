/**
 * @fileoverview Dedicated page for viewing, filtering, and managing the personal glossary.
 */
import React, { useState, useEffect } from 'react';
import InlineGlossaryTooltip from '../components/Notes/InlineGlossaryTooltip';

const PersonalGlossaryHub = () => {
    const [terms, setTerms] = useState([]);
    const [filter, setFilter] = useState('All');
    const [selection, setSelection] = useState(null);

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchGlossary();
    }, [filter]);

    const fetchGlossary = async () => {
        try {
            const url = filter === 'All' ? `${API_URL}/glossary` : `${API_URL}/glossary?subject=${filter}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) setTerms(data.data);
        } catch (error) {
            console.error('Failed to fetch glossary:', error);
        }
    };

    // Handle text selection in the document
    useEffect(() => {
        const handleMouseUp = () => {
            const sel = window.getSelection();
            const text = sel.toString().trim();

            if (text.length > 0 && text.length < 100) {
                const range = sel.getRangeAt(0);
                const context = range.startContainer.parentElement?.textContent || '';
                setSelection({ text, range, context });
            } else {
                setSelection(null);
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const subjects = ['All', 'General', 'Biology', 'Computer Science', 'Mathematics'];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Personal Glossary</h1>
                        <p className="text-gray-600 dark:text-gray-400">Highlight any text on this page to instantly define it and save it here.</p>
                    </div>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {terms.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400 text-lg">No terms saved yet.</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Highlight text anywhere on this page to get started.</p>
                        </div>
                    ) : (
                        terms.map(term => (
                            <div key={term.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{term.term}</h3>
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-full">
                                        {term.subject}
                                    </span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{term.definition}</p>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {term.relatedConcepts.map((concept, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md border border-blue-100 dark:border-blue-800">
                                            {concept}
                                        </span>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{term.exampleSentence}"</p>
                                </div>

                                <button className="mt-4 w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    Convert to Flashcard
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Floating Tooltip */}
            <InlineGlossaryTooltip
                selection={selection}
                onClose={() => {
                    setSelection(null);
                    window.getSelection().removeAllRanges();
                    fetchGlossary(); // Refresh list if saved
                }}
            />
        </div>
    );
};

export default PersonalGlossaryHub;
