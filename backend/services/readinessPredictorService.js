/**
 * @fileoverview Service for calculating exam readiness and confidence scores.
 * Analyzes historical quiz scores, flashcard retention, and time spent per topic.
 */

/**
 * Calculates the predicted exam score and identifies weak areas.
 * 
 * @param {Object} userData - User's historical performance data.
 * @param {number} targetScore - The user's desired exam score.
 * @returns {Object} Readiness analysis including score, confidence, and weak areas.
 */
function calculateReadiness(userData, targetScore) {
    const { quizScores, flashcardRetention, timeSpentMinutes } = userData;

    // 1. Calculate weighted average quiz score (recent quizzes weighted higher)
    let totalQuizWeight = 0;
    let weightedQuizSum = 0;
    quizScores.forEach((score, index) => {
        const weight = index + 1; // Newer quizzes have higher weight
        weightedQuizSum += score.percentage * weight;
        totalQuizWeight += weight;
    });
    const avgQuizScore = totalQuizWeight > 0 ? weightedQuizSum / totalQuizWeight : 0;

    // 2. Calculate average flashcard retention rate
    const avgRetention = flashcardRetention.length > 0
        ? flashcardRetention.reduce((sum, r) => sum + r.retentionRate, 0) / flashcardRetention.length
        : 0;

    // 3. Calculate readiness score (0-100)
    // Formula: 60% quiz performance, 40% flashcard retention
    const readinessScore = Math.round((avgQuizScore * 0.6) + (avgRetention * 0.4));

    // 4. Determine confidence level based on readiness score
    let confidenceLevel = 'Low';
    if (readinessScore >= 85) confidenceLevel = 'Very High';
    else if (readinessScore >= 70) confidenceLevel = 'High';
    else if (readinessScore >= 50) confidenceLevel = 'Moderate';

    // 5. Identify top 3 weak areas (topics with lowest combined score and retention)
    const topicPerformance = userData.topicData.map(topic => {
        const combinedScore = (topic.avgQuizScore * 0.7) + (topic.retentionRate * 0.3);
        return {
            name: topic.name,
            score: Math.round(combinedScore),
            timeSpent: topic.timeSpentMinutes,
            potentialImprovement: Math.max(0, 100 - combinedScore) // Higher means more room for improvement
        };
    });

    const weakAreas = topicPerformance
        .sort((a, b) => b.potentialImprovement - a.potentialImprovement)
        .slice(0, 3);

    // 6. Gap analysis for target score
    const scoreGap = Math.max(0, targetScore - readinessScore);
    const estimatedHoursNeeded = Math.ceil(scoreGap * 0.5); // Rough heuristic: 0.5 hours per point gap

    return {
        readinessScore,
        confidenceLevel,
        weakAreas,
        gapAnalysis: {
            targetScore,
            scoreGap,
            estimatedHoursNeeded,
            isAchievable: scoreGap <= 30 // Considered achievable if gap is 30 points or less
        }
    };
}

module.exports = {
    calculateReadiness,
};
