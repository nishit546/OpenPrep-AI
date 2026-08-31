const { sequelize } = require('../config/db');
const ExplainBackAttempt = require('../models/ExplainBackAttempt');
const Topic = require('../models/Topic');
const Note = require('../models/Note');
const { analyzeExplanation } = require('../utils/textAnalyzer');

class ExplainBackService {
  /**
   * Extract key points from a source
   */
  static async extractKeyPoints(sourceType, sourceId, customPoints = null) {
    if (sourceType === 'custom' && customPoints) {
      return customPoints;
    }
    
    if (sourceType === 'topic' && sourceId) {
      const topic = await Topic.findByPk(sourceId);
      if (!topic) {
        throw new Error('Topic not found');
      }
      // If topic has a summary, extract key points from it
      if (topic.summary) {
        return extractKeyPointsFromText(topic.summary);
      }
      // Otherwise use topic name and description
      return [
        topic.name,
        ...(topic.description ? extractKeyPointsFromText(topic.description) : []),
      ];
    }
    
    if (sourceType === 'note' && sourceId) {
      const note = await Note.findByPk(sourceId);
      if (!note) {
        throw new Error('Note not found');
      }
      return extractKeyPointsFromText(note.content || note.title || '');
    }
    
    throw new Error('Invalid source type or missing source');
  }
  
  /**
   * Create a new explain-back attempt
   */
  static async createAttempt({
    userId,
    conceptId,
    sourceType,
    sourceId,
    explanation,
    customKeyPoints = null,
    timeSpent = null,
    selfRating = null,
    technicalTerms = [],
  }) {
    // Start transaction
    const t = await sequelize.transaction();
    
    try {
      // Get or extract key points
      let keyPoints = await this.extractKeyPoints(sourceType, sourceId, customKeyPoints);
      if (!keyPoints || keyPoints.length === 0) {
        throw new Error('No key points available for analysis');
      }
      
      // Ensure keyPoints is an array of strings
      if (typeof keyPoints === 'string') {
        keyPoints = [keyPoints];
      }
      
      // Get previous attempts for this concept to determine version
      const previousAttempts = await ExplainBackAttempt.findAll({
        where: {
          userId,
          conceptId,
        },
        order: [['version', 'DESC']],
        limit: 1,
        transaction: t,
      });
      
      const version = previousAttempts.length > 0 ? previousAttempts[0].version + 1 : 1;
      
      // Run the analysis
      const analysis = analyzeExplanation({
        keyPoints,
        explanation,
        technicalTerms,
      });
      
      // Create the attempt
      const attempt = await ExplainBackAttempt.create(
        {
          userId,
          conceptId,
          sourceType,
          sourceId,
          sourceKeyPoints: keyPoints,
          explanation,
          version,
          coverageScore: analysis.coverageScore,
          matchedPoints: analysis.matchedPoints,
          missedPoints: analysis.missedPoints,
          jargonDensity: analysis.jargonDensity,
          simplicityScore: analysis.simplicityScore,
          avgSentenceLength: analysis.avgSentenceLength,
          wordCount: analysis.wordCount,
          technicalTermCount: analysis.technicalTermCount,
          timeSpent,
          selfRating,
          // Mark as best version if it's the highest coverage or first
          isBestVersion: version === 1 || analysis.coverageScore > (previousAttempts[0]?.coverageScore || 0),
        },
        { transaction: t }
      );
      
      await t.commit();
      
      return {
        attempt,
        analysis,
        version,
        previousAttempts: previousAttempts.length,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  
  /**
   * Get all attempts for a user and concept
   */
  static async getAttemptsForConcept(userId, conceptId) {
    return ExplainBackAttempt.findAll({
      where: {
        userId,
        conceptId,
      },
      order: [['version', 'ASC']],
    });
  }
  
  /**
   * Get the best attempt for a concept
   */
  static async getBestAttempt(userId, conceptId) {
    return ExplainBackAttempt.findOne({
      where: {
        userId,
        conceptId,
        isBestVersion: true,
      },
    });
  }
  
  /**
   * Get all concepts with attempts for a user
   */
  static async getUserConcepts(userId) {
    const attempts = await ExplainBackAttempt.findAll({
      where: { userId },
      attributes: [
        'conceptId',
        [sequelize.fn('MAX', sequelize.col('coverageScore')), 'bestCoverage'],
        [sequelize.fn('MAX', sequelize.col('version')), 'attemptCount'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastAttempt'],
      ],
      group: ['conceptId'],
      order: [[sequelize.literal('"lastAttempt"'), 'DESC']],
    });
    
    return attempts;
  }
  
  /**
   * Get coverage progress over time for a concept
   */
  static async getCoverageProgress(userId, conceptId) {
    const attempts = await ExplainBackAttempt.findAll({
      where: {
        userId,
        conceptId,
      },
      attributes: [
        'id',
        'version',
        'coverageScore',
        'createdAt',
        'jargonDensity',
        'simplicityScore',
      ],
      order: [['createdAt', 'ASC']],
    });
    
    return attempts.map((a) => ({
      version: a.version,
      coverageScore: a.coverageScore,
      jargonDensity: a.jargonDensity,
      simplicityScore: a.simplicityScore,
      date: a.createdAt,
    }));
  }
  
  /**
   * Add AI enrichment to an attempt (optional, additive only)
   */
  static async addAIEnrichment(attemptId, aiFeedback) {
    const attempt = await ExplainBackAttempt.findByPk(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }
    
    attempt.aiFeedback = aiFeedback;
    await attempt.save();
    
    return attempt;
  }
  
  /**
   * Delete an attempt
   */
  static async deleteAttempt(attemptId, userId) {
    const attempt = await ExplainBackAttempt.findOne({
      where: {
        id: attemptId,
        userId,
      },
    });
    
    if (!attempt) {
      throw new Error('Attempt not found or unauthorized');
    }
    
    await attempt.destroy();
    return { success: true };
  }
  
  /**
   * Get stats for a user
   */
  static async getUserStats(userId) {
    const totalAttempts = await ExplainBackAttempt.count({
      where: { userId },
    });
    
    const uniqueConcepts = await ExplainBackAttempt.count({
      where: { userId },
      distinct: true,
      col: 'conceptId',
    });
    
    const avgCoverage = await ExplainBackAttempt.findOne({
      where: { userId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('coverageScore')), 'avgCoverage'],
      ],
    });
    
    const bestAttempt = await ExplainBackAttempt.findOne({
      where: { userId },
      order: [['coverageScore', 'DESC']],
    });
    
    return {
      totalAttempts,
      uniqueConcepts,
      averageCoverage: avgCoverage?.dataValues?.avgCoverage || 0,
      bestCoverage: bestAttempt?.coverageScore || 0,
      bestAttemptId: bestAttempt?.id || null,
    };
  }
}

/**
 * Helper: Extract key points from text
 */
function extractKeyPointsFromText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Try to split by bullet points, numbered lists, or sentences
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  
  const keyPoints = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Check if it's a bullet point or numbered item
    if (/^[•\-*]\s|^\d+[\.\)]\s/.test(trimmed)) {
      const cleaned = trimmed.replace(/^[•\-*]\s|^\d+[\.\)]\s/, '').trim();
      if (cleaned.length > 5) {
        keyPoints.push(cleaned);
      }
    } else if (trimmed.length > 10 && trimmed.length < 200) {
      // If it's a reasonable sentence length, treat as a key point
      keyPoints.push(trimmed);
    }
  }
  
  // If no key points found, try splitting by sentences
  if (keyPoints.length === 0) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    for (const sentence of sentences.slice(0, 10)) {
      keyPoints.push(sentence.trim());
    }
  }
  
  // If still no key points, use the first few words as a point
  if (keyPoints.length === 0 && text.length > 5) {
    keyPoints.push(text.slice(0, 100));
  }
  
  return keyPoints;
}

module.exports = ExplainBackService;