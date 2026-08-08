const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');

// @desc    Generate AI hint / step-by-step explanation for a quiz question
// @route   POST /api/ai/explain-question
// @access  Private
exports.explainQuestion = async (req, res, next) => {
  try {
    const {
      question,
      options,
      correctAnswer,
      userAnswer,
      explanation,
      mode,
      subjectName,
      topicName,
    } = req.body;

    const explanationData = await geminiService.generateQuestionExplanation({
      question,
      options,
      correctAnswer,
      userAnswer: userAnswer ?? null,
      explanation: explanation || '',
      mode: mode || 'full',
      subjectName: subjectName || '',
      topicName: topicName || '',
      forceRefresh: req.query.refresh === 'true',
    });

    res.status(200).json({ success: true, data: explanationData });
  } catch (error) {
    // Handle Gemini API rate limit errors
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    // Handle Gemini API server errors
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};
