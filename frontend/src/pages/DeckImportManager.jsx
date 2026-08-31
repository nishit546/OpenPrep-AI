/**
 * @fileoverview Main page for managing flashcard imports and accessing the import wizard.
 */
import React, { useState } from 'react';
import DeckImportWizard from '../components/Decks/DeckImportWizard';

const DeckImportManager = () => {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [lastImport, setLastImport] = useState(null);

    const handleImportComplete = () => {
        setLastImport(new Date().toLocaleString());
        setIsWizardOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Deck Importer</h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Seamlessly migrate your existing study materials from Anki, Quizlet, or other platforms by uploading CSV or JSON exports.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to Import?</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        Our smart parser will automatically detect columns, remove duplicates, and format your cards for OpenPrep-AI's spaced repetition system.
                    </p>

                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Start Import Wizard
                    </button>

                    {lastImport && (
                        <p className="mt-6 text-sm text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Last successful import: {lastImport}
                        </p>
                    )}
                </div>

                <DeckImportWizard
                    isOpen={isWizardOpen}
                    onClose={() => setIsWizardOpen(false)}
                    onImportComplete={handleImportComplete}
                />
            </div>
        </div>
    );
};

export default DeckImportManager;
