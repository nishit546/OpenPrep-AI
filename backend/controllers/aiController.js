const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const llmService = require('../utils/llmService');
const { ContextIsolationError } = require('../utils/aiContextIsolation');
const Question = require('../models/Question');
const Note = require('../models/Note');
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

// @desc    Interact with the AI study assistant (chat)
// @route   POST /api/ai/chat
// @access  Private
exports.chatWithAssistant = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    const responseText = await geminiService.generateChatResponse({
      message,
      history: history || [],
    });

    res.status(200).json({ success: true, text: responseText });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Solve uploaded math/physics formula or diagram image via Gemini Multimodal Vision
// @route   POST /api/ai/solve-image
// @access  Private
exports.solveImageQuestion = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Please upload an image file of the equation or diagram.' });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Invalid file format. Only JPEG, PNG, and WebP images are supported.' });
    }

    const { prompt } = req.body;
    const solution = await geminiService.solveImageQuestion(req.file.buffer, req.file.mimetype, prompt || '');

    res.status(200).json({
      success: true,
      data: solution,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Generate AI questions from source document/note and persist to database
// @route   POST /api/ai/generate-questions
// @access  Private
exports.generateQuestions = async (req, res, next) => {
  try {
    let { noteId, content, title, numQuestions = 5, type = 'multiple_choice', difficulty = 'medium' } = req.body;

    if (!content && noteId) {
      const note = await Note.findByPk(noteId);
      if (!note) {
        return res.status(404).json({ success: false, error: 'Source note not found' });
      }
      if (note.user !== req.user.id) {
        return res.status(403).json({ success: false, error: 'You do not have access to this note' });
      }
      content = note.content || note.summary || note.title;
      title = title || note.title;
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document content or a valid noteId is required for question generation',
      });
    }

    // Call LLM service utility wrapper
    const generatedRawList = await llmService.generateQuestionsFromContent({
      content,
      title: title || 'Document Note',
      numQuestions: Number(numQuestions) || 5,
      type,
      difficulty,
    });

    // Format & bulk create questions in database
    const questionsToCreate = generatedRawList.map((item) => ({
      user: req.user.id,
      noteId: noteId || null,
      question: item.question,
      answer: item.answer,
      options: item.options || [],
      type: item.type || type,
      difficulty: item.difficulty || difficulty,
      sourceTitle: title || 'AI Document',
    }));

    const savedQuestions = await Question.bulkCreate(questionsToCreate);

    res.status(201).json({
      success: true,
      data: savedQuestions,
      count: savedQuestions.length,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof ContextIsolationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

exports.getArtifactHistory = async (req, res) => {
  try {
    const { artifactId } = req.params;
    const history = await AIContractVersioningService.getArtifactHistory(artifactId);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get cache statistics for current user
 */
exports.getCacheStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await AIGenerationCacheService.getCacheStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Clear expired cache entries (admin endpoint)
 */
exports.clearExpiredCache = async (req, res) => {
  try {
    const count = await AIGenerationCacheService.clearExpiredCache();
    res.json({ success: true, message: `Cleared ${count} expired entries` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};