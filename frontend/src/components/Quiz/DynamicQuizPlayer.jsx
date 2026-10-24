/**
 * @fileoverview Interactive quiz player that reveals detailed explanations upon answer submission.
 */
import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import PrintableExamModal from './PrintableExamModal';

const DynamicQuizPlayer = ({ questions, onSubmit }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [userAnswers, setUserAnswers] = useState([]);
    const [showPrintModal, setShowPrintModal] = useState(false);

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    const handleAnswerSelect = (answer) => {
        if (!isSubmitted) {
            setSelectedAnswer(answer);
        }
    };

    const handleSubmitAnswer = () => {
        if (!selectedAnswer) return;

        const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
        const answerRecord = {
            questionId: currentQuestion.id,
            selectedAnswer,
            isCorrect,
            topic: currentQuestion.topic
        };

        setIsSubmitted(true);
        setUserAnswers(prev => [...prev, answerRecord]);
    };

    const handleNext = () => {
        if (isLastQuestion) {
            onSubmit(userAnswers);
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsSubmitted(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 w-full">
                <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                ></div>
            </div>

            <div className="p-8">
                {/* Question Header */}
                <div className="flex justify-between items-center mb-6">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wide">
                        {currentQuestion.topic}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowPrintModal(true)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition no-print"
                            title="Print Offline Question Paper"
                        >
                            <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Print Exam
                        </button>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Question {currentIndex + 1} of {questions.length}
                        </span>
                    </div>
                </div>

                {/* Question Text */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 leading-relaxed">
                    {currentQuestion.question}
                </h3>

                {/* Options */}
                <div className="space-y-3 mb-8">
                    {currentQuestion.options.map((option, idx) => {
                        let optionClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 ";

                        if (isSubmitted) {
                            if (option === currentQuestion.correctAnswer) {
                                optionClass += "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100";
                            } else if (option === selectedAnswer) {
                                optionClass += "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100";
                            } else {
                                optionClass += "border-gray-200 dark:border-gray-700 opacity-50";
                            }
                        } else {
                            optionClass += selectedAnswer === option
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100"
                                : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700/50";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswerSelect(option)}
                                disabled={isSubmitted}
                                className={optionClass}
                            >
                                <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5
                  ${isSubmitted && option === currentQuestion.correctAnswer ? 'border-green-500 text-green-600' : 
                    isSubmitted && option === selectedAnswer ? 'border-red-500 text-red-600' : 
                    selectedAnswer === option ? 'border-blue-500 text-blue-600' : 'border-gray-300 dark:border-gray-600 text-gray-500'}">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-sm font-medium">{option}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Explanations (Revealed after submission) */}
                {isSubmitted && (
                    <div className={`p-5 rounded-xl mb-8 border-l-4 ${selectedAnswer === currentQuestion.correctAnswer
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                            : 'bg-red-50 dark:bg-red-900/10 border-red-500'
                        }`}>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            {selectedAnswer === currentQuestion.correctAnswer ? (
                                <><span className="text-green-600">✓</span> Correct!</>
                            ) : (
                                <><span className="text-red-600">✗</span> Incorrect</>
                            )}
                        </h4>
                        <div className="space-y-3 text-sm">
                            <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Why it's correct:</span> {currentQuestion.explanations.correct}
                            </p>
                            {selectedAnswer !== currentQuestion.correctAnswer && (
                                <p className="text-gray-700 dark:text-gray-300">
                                    <span className="font-semibold">Common misconception:</span> {currentQuestion.explanations.incorrect}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end">
                    {!isSubmitted ? (
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={!selectedAnswer}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white font-semibold rounded-xl transition-colors"
                        >
                            Submit Answer
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl transition-colors flex items-center gap-2"
                        >
                            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {showPrintModal && (
                <PrintableExamModal
                    quizTitle={`${currentQuestion?.topic || 'Practice'} Examination`}
                    subject={currentQuestion?.topic || 'General Studies'}
                    questions={questions}
                    onClose={() => setShowPrintModal(false)}
                />
            )}
        </div>
    );
};

export default DynamicQuizPlayer;
