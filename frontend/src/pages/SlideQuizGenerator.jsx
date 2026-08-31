/**
 * @fileoverview Main page for uploading lecture slides and viewing the generated interactive quizzes.
 */
import React, { useState } from 'react';
import SlideQuizViewer from '../components/Slides/SlideQuizViewer';
import axios from 'axios';

const SlideQuizGenerator = () => {
    const [file, setFile] = useState(null);
    const [quizData, setQuizData] = useState(null);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
            setFile(selectedFile);
            setError('');
        } else {
            setError('Please select a valid PDF or PPTX file.');
            setFile(null);
        }
    };

    const handleGenerate = async () => {
        if (!file) return;

        setIsGenerating(true);
        setError('');
        setQuizData(null);

        const formData = new FormData();
        formData.append('document', file);

        try {
            const response = await axios.post(`${API_URL}/slide-quiz/generate`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setQuizData(response.data.data);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate quiz. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = async (questions, slideTitle) => {
        try {
            const response = await axios.post(`${API_URL}/slide-quiz/export`, {
                questions,
                slideTitle
            });
            if (response.data.success) {
                alert(response.data.message);
            }
        } catch (err) {
            alert('Failed to export to flashcards.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Slide to Quiz Converter</h1>
                    <p className="text-gray-600 dark:text-gray-400">Upload your lecture slides and instantly generate interactive, slide-specific quiz questions.</p>
                </div>

                {!quizData ? (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    accept=".pdf,.pptx"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="slide-upload"
                                />
                                <label htmlFor="slide-upload" className="cursor-pointer flex flex-col items-center">
                                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <span className="text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF or PPTX up to 20MB</p>
                                </label>
                            </div>

                            {file && (
                                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">{file.name}</span>
                                    <button onClick={() => setFile(null)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={!file || isGenerating}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Analyzing Slides & Generating Questions...
                                    </>
                                ) : 'Generate Interactive Quiz'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
                        {/* Sidebar: Slide Navigation */}
                        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 px-2">Slides ({quizData.totalSlides})</h3>
                            <div className="space-y-2">
                                {quizData.slides.map((slide, idx) => (
                                    <button
                                        key={slide.slideNumber}
                                        onClick={() => setCurrentSlideIndex(idx)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${currentSlideIndex === idx
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <span className="font-bold block mb-1">Slide {slide.slideNumber}</span>
                                        <span className="truncate block opacity-80">{slide.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main: Quiz Viewer */}
                        <div className="lg:col-span-9 h-full">
                            <SlideQuizViewer
                                slideData={quizData.slides[currentSlideIndex]}
                                onExport={handleExport}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlideQuizGenerator;
