const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const InterleavedPracticeSet = require('../models/InterleavedPracticeSet');
const QuizAttempt = require('../models/QuizAttempt');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const {
  generateInterleavedSequence,
  generateConfusablePairs,
  calculateInterleavingBenefit,
  recommendInterferenceLevel,
  calculateSwitchRate,
  calculateMaxRunLength,
  calculateEntropy,
} = require('../utils/sequenceOptimizer');

class InterleavedPracticeService {
  /**
   * Generate a new interleaved practice set
   */
  static async generateSet({
    userId,
    topicIds,
    interferenceLevel = 0.5,
    questionCount = 10,
    seed = null,
    includeConfusable = true,
    minAccuracyThreshold = 0.6,
  }) {
    const t = await sequelize.transaction();

    try {
      // Validate topics
      const topics = await Topic.findAll({
        where: {
          id: { [Op.in]: topicIds },
        },
        transaction: t,
      });

      if (topics.length === 0) {
        throw new Error('No valid topics found');
      }

      // Get questions for each topic
      const topicItems = {};
      const allQuestions = [];

      for (const topic of topics) {
        const questions = await Question.findAll({
          where: {
            topicId: topic.id,
            isActive: true,
          },
          attributes: ['id', 'topicId'],
          transaction: t,
        });

        if (questions.length > 0) {
          topicItems[topic.id] = questions.map(q => q.id);
          allQuestions.push(...questions.map(q => q.id));
        }
      }

      if (Object.keys(topicItems).length === 0) {
        throw new Error('No questions available for the selected topics');
      }

      // Get topic readiness (accuracy)
      const topicReadiness = await this.getTopicReadiness(userId, topicIds, t);

      // Get confusable pairs
      let confusablePairs = [];
      if (includeConfusable) {
        confusablePairs = await this.getConfusablePairs(userId, topicIds, t);
      }

      // Generate sequence
      const result = generateInterleavedSequence({
        topicItems,
        interferenceLevel,
        questionCount,
        seed,
        confusablePairs,
        minAccuracyThreshold,
        topicReadiness,
        noAdjacentRepeat: true,
      });

      // Create the practice set
      const practiceSet = await InterleavedPracticeSet.create(
        {
          userId,
          interferenceLevel,
          questionCount: result.metadata.totalQuestions,
          seed: seed || Date.now(),
          topicIds,
          questionSequence: result.questionSequence,
          topicSequence: result.topicSequence,
          switchRate: result.metadata.switchRate,
          maxRunLength: result.metadata.maxRunLength,
          sequenceEntropy: result.metadata.entropy,
          confusableAdjacencyRatio: result.metadata.confusableAdjacencyRatio,
          status: 'generated',
          results: {},
        },
        { transaction: t }
      );

      await t.commit();

      // Get question details for frontend
      const questions = await Question.findAll({
        where: {
          id: { [Op.in]: result.questionSequence },
        },
        include: [
          {
            model: Topic,
            as: 'topic',
            attributes: ['id', 'name', 'subjectId'],
          },
        ],
      });

      const questionMap = {};
      for (const q of questions) {
        questionMap[q.id] = q;
      }

      const sequenceWithDetails = result.questionSequence.map(qId => ({
        questionId: qId,
        topicId: result.topicSequence[result.questionSequence.indexOf(qId)],
        question: questionMap[qId] || null,
      }));

      return {
        practiceSet,
        sequence: sequenceWithDetails,
        metadata: result.metadata,
        topicReadiness,
        confusablePairs,
        topics: topics.map(t => ({
          id: t.id,
          name: t.name,
          subjectId: t.subjectId,
        })),
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get topic readiness (accuracy) for a user
   */
  static async getTopicReadiness(userId, topicIds, transaction = null) {
    const readiness = {};

    for (const topicId of topicIds) {
      // Get quiz attempts for this topic
      const attempts = await QuizAttempt.findAll({
        where: {
          userId,
          topicId,
          isCompleted: true,
        },
        attributes: ['score', 'totalQuestions'],
        transaction,
      });

      if (attempts.length === 0) {
        readiness[topicId] = 0;
        continue;
      }

      // Calculate average accuracy
      let totalCorrect = 0;
      let totalQuestions = 0;
      for (const attempt of attempts) {
        totalCorrect += attempt.score || 0;
        totalQuestions += attempt.totalQuestions || 0;
      }

      readiness[topicId] = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
    }

    return readiness;
  }

  /**
   * Get confusable pairs from historical data
   */
  static async getConfusablePairs(userId, topicIds, transaction = null) {
    // Get quiz attempts with distractor analysis
    const attempts = await QuizAttempt.findAll({
      where: {
        userId,
        topicId: { [Op.in]: topicIds },
        isCompleted: true,
      },
      include: [
        {
          model: QuizQuestion,
          as: 'questions',
          attributes: ['questionId', 'selectedOptionId', 'isCorrect', 'options'],
        },
      ],
      transaction,
    });

    const confusableData = [];

    for (const attempt of attempts) {
      for (const q of attempt.questions || []) {
        if (!q.isCorrect && q.options) {
          // Find which distractor was selected
          const selectedOption = q.options.find(o => o.id === q.selectedOptionId);
          if (selectedOption && selectedOption.topicId && selectedOption.topicId !== attempt.topicId) {
            confusableData.push({
              questionId: q.questionId,
              topicId: attempt.topicId,
              distractorTopicId: selectedOption.topicId,
            });
          }
        }
      }
    }

    // Generate confusable pairs
    const pairs = {};
    for (const entry of confusableData) {
      const key = [entry.topicId, entry.distractorTopicId].sort().join('-');
      pairs[key] = (pairs[key] || 0) + 1;
    }

    // Return top pairs
    return Object.entries(pairs)
      .map(([key, count]) => {
        const [topicA, topicB] = key.split('-');
        return { topicA, topicB, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  /**
   * Get a practice set by ID
   */
  static async getSetById(setId, userId) {
    const practiceSet = await InterleavedPracticeSet.findOne({
      where: {
        id: setId,
        userId,
      },
    });

    if (!practiceSet) {
      throw new Error('Practice set not found');
    }

    return practiceSet;
  }

  /**
   * Get all practice sets for a user
   */
  static async getUserSets(userId, limit = 50, offset = 0) {
    const { count, rows } = await InterleavedPracticeSet.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      total: count,
      sets: rows,
    };
  }

  /**
   * Update practice set with results
   */
  static async updateResults(setId, userId, results) {
    const practiceSet = await this.getSetById(setId, userId);

    // Merge results
    const updatedResults = {
      ...practiceSet.results,
      ...results,
    };

    practiceSet.results = updatedResults;

    // Calculate performance metrics
    const questions = Object.values(updatedResults);
    const correctCount = questions.filter(q => q.correct).length;
    const accuracy = questions.length > 0 ? correctCount / questions.length : 0;

    practiceSet.accuracy = accuracy;

    await practiceSet.save();

    return practiceSet;
  }

  /**
   * Complete a practice set
   */
  static async completeSet(setId, userId, timeSpent = null) {
    const practiceSet = await this.getSetById(setId, userId);

    practiceSet.status = 'completed';
    practiceSet.completedAt = new Date();
    if (timeSpent) {
      practiceSet.timeSpent = timeSpent;
    }

    await practiceSet.save();

    return practiceSet;
  }

  /**
   * Get interleaving benefit for a user
   */
  static async getInterleavingBenefit(userId) {
    // Get completed interleaved sets
    const interleavedSets = await InterleavedPracticeSet.findAll({
      where: {
        userId,
        status: 'completed',
        results: { [Op.ne]: {} },
      },
    });

    if (interleavedSets.length === 0) {
      return {
        benefit: null,
        message: 'Not enough interleaved practice data yet',
        recommendations: { recommendedLevel: 0.5 },
      };
    }

    // Calculate benefit for each set
    const benefits = [];
    for (const set of interleavedSets) {
      // Get blocked practice results for same topics
      const blockedResults = await this.getBlockedResultsForTopics(
        userId,
        set.topicIds,
        set.createdAt
      );

      if (blockedResults.length > 0) {
        const interleavedResults = Object.values(set.results);
        const benefit = calculateInterleavingBenefit(
          interleavedResults,
          blockedResults
        );

        benefits.push({
          setId: set.id,
          interferenceLevel: set.interferenceLevel,
          benefit,
          createdAt: set.createdAt,
        });
      }
    }

    if (benefits.length === 0) {
      return {
        benefit: null,
        message: 'Not enough blocked practice data for comparison',
        recommendations: { recommendedLevel: 0.5 },
      };
    }

    // Average benefit
    const avgBenefit = benefits.reduce((sum, b) => sum + b.benefit, 0) / benefits.length;

    // Recommend interference level
    const recommendedLevel = recommendInterferenceLevel(benefits);

    return {
      benefit: avgBenefit,
      history: benefits,
      recommendations: {
        recommendedLevel,
        currentLevel: recommendedLevel,
        confidence: benefits.length >= 5 ? 'high' : 'medium',
        message: benefits.length >= 5
          ? `Based on ${benefits.length} practice sessions, ${recommendedLevel.toFixed(2)} interference level is recommended`
          : `Based on ${benefits.length} sessions, ${recommendedLevel.toFixed(2)} interference level shows promise`,
      },
    };
  }

  /**
   * Get blocked practice results for comparison
   */
  static async getBlockedResultsForTopics(userId, topicIds, afterDate) {
    // Find quiz attempts that were blocked (single topic)
    const attempts = await QuizAttempt.findAll({
      where: {
        userId,
        topicId: { [Op.in]: topicIds },
        isCompleted: true,
        createdAt: { [Op.lt]: afterDate },
        // Single topic (blocked) - likely quizzes with only one topic
      },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    return attempts.map(a => ({
      topicId: a.topicId,
      correct: a.score / a.totalQuestions,
      timeSpent: a.timeSpent || 0,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Delete a practice set
   */
  static async deleteSet(setId, userId) {
    const practiceSet = await this.getSetById(setId, userId);
    await practiceSet.destroy();
    return { success: true };
  }

  /**
   * Get statistics for a user
   */
  static async getUserStats(userId) {
    const totalSets = await InterleavedPracticeSet.count({
      where: { userId },
    });

    const completedSets = await InterleavedPracticeSet.count({
      where: { userId, status: 'completed' },
    });

    const avgInterference = await InterleavedPracticeSet.findOne({
      where: { userId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('interferenceLevel')), 'avgInterference'],
      ],
    });

    const avgSwitchRate = await InterleavedPracticeSet.findOne({
      where: { userId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('switchRate')), 'avgSwitchRate'],
      ],
    });

    const bestSet = await InterleavedPracticeSet.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return {
      totalSets,
      completedSets,
      completionRate: totalSets > 0 ? completedSets / totalSets : 0,
      averageInterferenceLevel: avgInterference?.dataValues?.avgInterference || 0,
      averageSwitchRate: avgSwitchRate?.dataValues?.avgSwitchRate || 0,
      lastSetId: bestSet?.id || null,
      lastSetDate: bestSet?.createdAt || null,
    };
  }
}

module.exports = InterleavedPracticeService;