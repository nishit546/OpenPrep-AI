/**
 * @fileoverview Visual semi-circular gauge component for displaying exam readiness score.
 */
import React from 'react';

const ReadinessGauge = ({ score, confidenceLevel }) => {
    // Determine color based on score
    const getColor = (s) => {
        if (s >= 85) return '#10b981'; // Green
        if (s >= 70) return '#3b82f6'; // Blue
        if (s >= 50) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    };

    const color = getColor(score);
    const radius = 80;
    const circumference = Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="relative w-48 h-24 overflow-hidden mb-4">
                {/* Background Arc */}
                <svg className="w-48 h-48 absolute top-0 left-0 transform -rotate-0" viewBox="0 0 200 200">
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="16"
                        className="dark:stroke-gray-700"
                    />
                    {/* Foreground Arc (Animated) */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={color}
                        strokeWidth="16"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* Score Text */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{score}%</span>
                </div>
            </div>

            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Exam Readiness</h3>
                <span
                    className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: color }}
                >
                    {confidenceLevel} Confidence
                </span>
            </div>
        </div>
    );
};

export default ReadinessGauge;
