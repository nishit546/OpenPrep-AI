/**
 * Calculates a weighted Mastery Score Min[0, 100] for a specific syllabus topic.
 * Formula components:
 * - Quiz accuracy on topic questions (40%)
 * - Spaced repetition retention stability (30%)
 * - Recency: Days elapsed since last active review (20%)
 * - PYQ Exam Weightage (10%)
 */
function calculateMasteryScore({ accuracy, retentionRate, daysSinceReview, pyqWeight }) {
  // Accuracy Component (40%): Scale direct percentage accuracy
  const scoreAccuracy = accuracy * 0.4;

  // Retention Component (30%): Scale spacing memory factors 
  const scoreRetention = retentionRate * 0.3;

  // Recency Component (20%): Time decay formula penalizing prolonged absence
  // Zero penalty within 3 days; exponential scaling decay cap at 30 days
  const recencyPenalty = Math.max(0, Math.min(20, (daysSinceReview - 3) * 0.75));
  const scoreRecency = Math.max(0, 20 - recencyPenalty);

  // PYQ Weightage Component (10%): High weight reduces initial proficiency if unreviewed
  const scoreWeight = (100 - pyqWeight) * 0.1;

  const totalScore = Math.min(100, Math.max(0, scoreAccuracy + scoreRetention + scoreRecency + scoreWeight));
  return Math.round(totalScore);
}

function getMasteryCategory(score) {
  if (score < 40) return 'Critical Vulnerability';
  if (score <= 75) return 'Moderate';
  return 'Mastered';
}

function generateDailyRecommendations(topics) {
  // Sort topics primarily by visibility risks: low mastery combined with high exam exposure
  return topics
    .filter(t => t.masteryScore <= 75)
    .sort((a, b) => (a.masteryScore - b.masteryScore) || (b.pyqWeight - a.pyqWeight))
    .slice(0, 3)
    .map(topic => ({
      id: topic.id,
      title: `Review ${topic.name}`,
      description: `Current Mastery: ${topic.masteryScore}% (Accuracy: ${topic.accuracy}% - High Exam Weightage)`,
      topicId: topic.id
    }));
}

module.exports = { calculateMasteryScore, getMasteryCategory, generateDailyRecommendations };
