const { calculateMasteryScore, generateDailyRecommendations } = require('../services/weaknessEngine');

// Mock Data Storage Hook
const mockTopicDatabase = [
  { id: 'ch_1', name: 'Organic Chemistry Reaction Mechanisms', subjectId: 'chem_12', accuracy: 32, retentionRate: 45, daysSinceReview: 14, pyqWeight: 85 },
  { id: 'ch_2', name: 'Electrochemistry Foundations', subjectId: 'chem_12', accuracy: 55, retentionRate: 60, daysSinceReview: 4, pyqWeight: 60 },
  { id: 'ch_3', name: 'Chemical Kinetics & Rates', subjectId: 'chem_12', accuracy: 88, retentionRate: 90, daysSinceReview: 1, pyqWeight: 40 }
];

exports.getSubjectHeatmap = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const targetTopics = mockTopicDatabase.filter(t => t.subjectId === subjectId);

    const heatmapTree = targetTopics.map(topic => {
      const score = calculateMasteryScore(topic);
      return {
        ...topic,
        masteryScore: score,
        category: score < 40 ? 'critical' : score <= 75 ? 'moderate' : 'mastered'
      };
    });

    return res.status(200).json({ success: true, heatmapTree });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDailyRecommendations = async (req, res) => {
  try {
    const fullyEvaluatedTopics = mockTopicDatabase.map(t => ({
      ...t,
      masteryScore: calculateMasteryScore(t)
    }));
    
    const recommendations = generateDailyRecommendations(fullyEvaluatedTopics);
    return res.status(200).json({ success: true, recommendations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
