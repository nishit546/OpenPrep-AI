const ExplainBackService = require('../services/explainBackService');
const { analyzeExplanation } = require('../utils/textAnalyzer');

/**
 * @desc    Create a new explain-back attempt
 * @route   POST /api/explain-back/attempt
 * @access  Private
 */
exports.createAttempt = async (req, res, next) => {
  try {
    const {
      conceptId,
      sourceType = 'topic',
      sourceId,
      explanation,
      customKeyPoints,
      timeSpent,
      selfRating,
      technicalTerms = [],
    } = req.body;
    
    if (!conceptId) {
      return res.status(400).json({
        success: false,
        error: 'Concept ID is required',
      });
    }
    
    if (!explanation || explanation.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Explanation must be at least 5 characters long',
      });
    }
    
    const result = await ExplainBackService.createAttempt({
      userId: req.user.id,
      conceptId,
      sourceType,
      sourceId,
      explanation,
      customKeyPoints,
      timeSpent,
      selfRating,
      technicalTerms,
    });
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Analyze explanation without saving (preview)
 * @route   POST /api/explain-back/analyze
 * @access  Private
 */
exports.analyze = async (req, res, next) => {
  try {
    const {
      keyPoints,
      explanation,
      technicalTerms = [],
    } = req.body;
    
    if (!keyPoints || keyPoints.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Key points are required for analysis',
      });
    }
    
    if (!explanation || explanation.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Explanation must be at least 5 characters long',
      });
    }
    
    const analysis = analyzeExplanation({
      keyPoints,
      explanation,
      technicalTerms,
    });
    
    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all attempts for a concept
 * @route   GET /api/explain-back/concept/:conceptId
 * @access  Private
 */
exports.getConceptAttempts = async (req, res, next) => {
  try {
    const { conceptId } = req.params;
    
    const attempts = await ExplainBackService.getAttemptsForConcept(
      req.user.id,
      conceptId
    );
    
    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get best attempt for a concept
 * @route   GET /api/explain-back/concept/:conceptId/best
 * @access  Private
 */
exports.getBestAttempt = async (req, res, next) => {
  try {
    const { conceptId } = req.params;
    
    const attempt = await ExplainBackService.getBestAttempt(
      req.user.id,
      conceptId
    );
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'No attempts found for this concept',
      });
    }
    
    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get coverage progress for a concept
 * @route   GET /api/explain-back/concept/:conceptId/progress
 * @access  Private
 */
exports.getProgress = async (req, res, next) => {
  try {
    const { conceptId } = req.params;
    
    const progress = await ExplainBackService.getCoverageProgress(
      req.user.id,
      conceptId
    );
    
    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all concepts with attempts for user
 * @route   GET /api/explain-back/concepts
 * @access  Private
 */
exports.getUserConcepts = async (req, res, next) => {
  try {
    const concepts = await ExplainBackService.getUserConcepts(req.user.id);
    
    res.status(200).json({
      success: true,
      data: concepts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user stats
 * @route   GET /api/explain-back/stats
 * @access  Private
 */
exports.getStats = async (req, res, next) => {
  try {
    const stats = await ExplainBackService.getUserStats(req.user.id);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add AI enrichment to an attempt
 * @route   POST /api/explain-back/:attemptId/enrich
 * @access  Private
 */
exports.addAIEnrichment = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { aiFeedback } = req.body;
    
    if (!aiFeedback) {
      return res.status(400).json({
        success: false,
        error: 'AI feedback is required',
      });
    }
    
    const attempt = await ExplainBackService.addAIEnrichment(attemptId, aiFeedback);
    
    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an attempt
 * @route   DELETE /api/explain-back/:attemptId
 * @access  Private
 */
exports.deleteAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    
    const result = await ExplainBackService.deleteAttempt(attemptId, req.user.id);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Extract key points from text
 * @route   POST /api/explain-back/extract-points
 * @access  Private
 */
exports.extractKeyPoints = async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text || text.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Text must be at least 10 characters long',
      });
    }
    
    const keyPoints = extractKeyPointsFromText(text);
    
    res.status(200).json({
      success: true,
      data: {
        keyPoints,
        count: keyPoints.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Extract key points from text
 */
function extractKeyPointsFromText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const keyPoints = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[•\-*]\s|^\d+[\.\)]\s/.test(trimmed)) {
      const cleaned = trimmed.replace(/^[•\-*]\s|^\d+[\.\)]\s/, '').trim();
      if (cleaned.length > 5) {
        keyPoints.push(cleaned);
      }
    } else if (trimmed.length > 10 && trimmed.length < 200) {
      keyPoints.push(trimmed);
    }
  }
  
  if (keyPoints.length === 0) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    for (const sentence of sentences.slice(0, 10)) {
      keyPoints.push(sentence.trim());
    }
  }
  
  if (keyPoints.length === 0 && text.length > 5) {
    keyPoints.push(text.slice(0, 100));
  }
  
  return keyPoints;
}