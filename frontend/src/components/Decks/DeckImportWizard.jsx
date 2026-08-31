/**
 * @fileoverview Multi-step wizard for file selection, preview, and final import.
 */
import React, { useState } from 'react';

const DeckImportWizard = ({ onClose, onImportComplete }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [deckName, setDeckName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.json'))) {
            setFile(selectedFile);
            setError('');
        } else {
            setError('Please select a valid CSV or JSON file.');
            setFile(null);
        }
    };

    const handlePreview = async () => {
        if (!file) return;
        setIsLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/deck-import/preview`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                setPreviewData(data.data);
                setStep(2);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to parse file. Please check the format.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!previewData || !deckName.trim()) return;
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/deck-import/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    importToken: previewData.importToken,
                    deckName: deckName.trim()
                })
            });
            const data = await response.json();

            if (data.success) {
                onImportComplete();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to finalize import.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Flashcards</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 pt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>1. Upload</span>
                        <span className={`text-sm font-medium ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>2. Preview & Import</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className={`bg-blue-600 h-2 rounded-full transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`}></div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                <input type="file" accept=".csv,.json" onChange={handleFileChange} className="hidden" id="import-file" />
                                <label htmlFor="import-file" className="cursor-pointer flex flex-col items-center">
                                    <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload CSV or JSON</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 10MB</p>
                                </label>
                            </div>
                            {file && <p className="text-center text-sm text-gray-600 dark:text-gray-400">Selected: {file.name}</p>}
                            {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                            <button onClick={handlePreview} disabled={!file || isLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors">
                                {isLoading ? 'Parsing...' : 'Preview Cards'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                                <p className="text-green-800 dark:text-green-200 font-medium">Found {previewData.totalParsed} cards</p>
                                <p className="text-sm text-green-600 dark:text-green-400">({previewData.duplicateCount} duplicates skipped)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Deck Name</label>
                                <input
                                    type="text"
                                    value={deckName}
                                    onChange={(e) => setDeckName(e.target.value)}
                                    placeholder="e.g., Imported Biology Terms"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Preview (First 3)</p>
                                {previewData.uniqueCards.slice(0, 3).map((card, idx) => (
                                    <div key={idx} className="text-sm p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                        <p className="font-medium text-gray-900 dark:text-white">Q: {card.front}</p>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">A: {card.back}</p>
                                    </div>
                                ))}
                            </div>

                            {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    Back
                                </button>
                                <button onClick={handleFinalize} disabled={!deckName.trim() || isLoading} className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl transition-colors">
                                    {isLoading ? 'Importing...' : 'Complete Import'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeckImportWizard;
