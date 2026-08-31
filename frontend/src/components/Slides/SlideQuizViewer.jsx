/**
 * @fileoverview Split-screen viewer showing the original slide content and its interactive quiz.
 */
import React, { useState } from 'react';

const SlideQuizViewer = ({ slideData, onExport }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [score, setScore] = useState(0);

    const currentQuestion = slideData.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === slideData.questions.length - 1;

    const handleOptionSelect = (option) => {
        if (showExplanation) return; // Prevent changing answer after submission
        setSelectedOption(option);
    };

    const handleSubmit = () => {
        if (!selectedOption) return;
        setShowExplanation(true);
        if (selectedOption === currentQuestion.correctAnswer) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (isLastQuestion) {
            // Quiz completed for this slide
            return;
        }
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowExplanation(false);
    };

    if (!slideData.questions || slideData.questions.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p>No questions could be generated for this slide. Please review the content manually.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Slide {slideData.slideNumber}: {slideData.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Question {currentQuestionIndex + 1} of {slideData.questions.length}</p>
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Score: {score}/{slideData.questions.length}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Question */}
                <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{currentQuestion.question}</h4>
                    <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => {
                            let optionClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ";

                            if (showExplanation) {
                                if (option === currentQuestion.correctAnswer) {
                                    optionClass += "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100";
                                } else if (option === selectedOption) {
                                    optionClass += "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100";
                                } else {
                                    optionClass += "border-gray-200 dark:border-gray-700 opacity-50";
                                }
                            } else {
                                optionClass += selectedOption === option
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100"
                                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700/50";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(option)}
                                    disabled={showExplanation}
                                    className={optionClass}
                                >
                                    <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Explanation & Actions */}
                {showExplanation && (
                    <div className={`p-4 rounded-xl border-l-4 ${selectedOption === currentQuestion.correctAnswer
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                            : 'bg-red-50 dark:bg-red-900/10 border-red-500'
                        }`}>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {selectedOption === currentQuestion.correctAnswer ? 'Correct!' : 'Incorrect'}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{currentQuestion.explanation}</p>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    {!showExplanation ? (
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedOption}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white font-semibold rounded-lg transition-colors"
                        >
                            Submit Answer
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-6 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg transition-colors"
                        >
                            {isLastQuestion ? 'Finish Slide Quiz' : 'Next Question'}
                        </button>
                    )}
                </div>

                {/* Export Action (Visible when quiz is done) */}
                {showExplanation && isLastQuestion && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex justify-between items-center">
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                            Quiz completed! Add these to your main flashcard deck?
                        </p>
                        <button
                            onClick={() => onExport(slideData.questions, slideData.title)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            Export to Flashcards
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlideQuizViewer;
