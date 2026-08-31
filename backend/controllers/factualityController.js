/**
 * @fileoverview Controller for Factuality and Citation Verification Engine API endpoints
 */
const factualityVerificationEngine = require('../services/factualityVerificationEngine');
const FactualityVerificationLog = require('../models/FactualityVerificationLog');
const Flashcard = require('../models/Flashcard');
const Question = require('../models/Question');

/**
 * @desc Verify factuality and citations for a flashcard
 * @route POST /api/factuality/verify-flashcard
 * @access Private
 */
exports.verifyFlashcardContent = async (req, res, next) => {
  try {
    const { flashcardId, front, back, hint, sourceContext, citations } = req.body;

    let targetFront = front;
    let targetBack = back;
    let cardInstance = null;

    if (flashcardId) {
      cardInstance = await Flashcard.findByPk(flashcardId);
      if (cardInstance) {
        targetFront = targetFront || cardInstance.front;
        targetBack = targetBack || cardInstance.back;
      }
    }

    if (!targetBack && !targetFront) {
      return res.status(400).json({
        success: false,
        error: 'Flashcard front or back content is required for verification.',
      });
    }

    const contentToVerify = `Question/Term: ${targetFront || ''}\nAnswer/Definition: ${targetBack || ''}${hint ? `\nHint: ${hint}` : ''}`;

    const report = await factualityVerificationEngine.evaluateFactuality({
      userId: req.user.id,
      targetType: 'flashcard',
      targetId: flashcardId || null,
      content: contentToVerify,
      sourceContext: sourceContext || '',
      citations: citations || [],
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Verify factuality and citations for AI explanation / hint text
 * @route POST /api/factuality/verify-explanation
 * @access Private
 */
exports.verifyExplanationContent = async (req, res, next) => {
  try {
    const { questionId, questionText, explanation, options, sourceContext, citations } = req.body;

    let targetQuestion = questionText;
    let targetExplanation = explanation;

    if (questionId) {
      const questionRecord = await Question.findByPk(questionId);
      if (questionRecord) {
        targetQuestion = targetQuestion || questionRecord.question;
        targetExplanation = targetExplanation || questionRecord.answer;
      }
    }

    if (!targetExplanation && !targetQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Explanation or question content is required for verification.',
      });
    }

    const contentToVerify = `Question: ${targetQuestion || ''}\nExplanation: ${targetExplanation || ''}${options ? `\nOptions: ${JSON.stringify(options)}` : ''}`;

    const report = await factualityVerificationEngine.evaluateFactuality({
      userId: req.user.id,
      targetType: 'explanation',
      targetId: questionId || null,
      content: contentToVerify,
      sourceContext: sourceContext || '',
      citations: citations || [],
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Batch verify multiple flashcards in a deck
 * @route POST /api/factuality/verify-batch
 * @access Private
 */
exports.verifyBatchFlashcards = async (req, res, next) => {
  try {
    const { flashcards, sourceContext } = req.body;

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'An array of flashcards is required for batch verification.',
      });
    }

    const reports = await Promise.all(
      flashcards.slice(0, 20).map(async (card) => {
        const content = `Question: ${card.front || ''}\nAnswer: ${card.back || ''}`;
        return factualityVerificationEngine.evaluateFactuality({
          userId: req.user.id,
          targetType: 'flashcard',
          targetId: card.id || null,
          content,
          sourceContext: sourceContext || '',
          citations: card.citations || [],
        });
      })
    );

    const averageTrustScore = Math.round(
      reports.reduce((acc, r) => acc + r.overallTrustScore, 0) / reports.length
    );

    return res.status(200).json({
      success: true,
      count: reports.length,
      averageTrustScore,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get saved verification audit report by ID
 * @route GET /api/factuality/report/:id
 * @access Private
 */
exports.getVerificationReport = async (req, res, next) => {
  try {
    const report = await FactualityVerificationLog.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Verification report not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Apply suggested factual correction to a flashcard or explanation
 * @route POST /api/factuality/apply-correction
 * @access Private
 */
exports.applyCorrection = async (req, res, next) => {
  try {
    const { targetType, targetId, correctedBack, correctedExplanation } = req.body;

    if (!targetId || !targetType) {
      return res.status(400).json({
        success: false,
        error: 'Target ID and target type are required.',
      });
    }

    if (targetType === 'flashcard') {
      const card = await Flashcard.findOne({ where: { id: targetId, user: req.user.id } });
      if (!card) {
        return res.status(404).json({ success: false, error: 'Flashcard not found.' });
      }
      if (correctedBack) {
        card.back = correctedBack;
        await card.save();
      }
      return res.status(200).json({
        success: true,
        message: 'Suggested correction applied successfully to flashcard.',
        data: card,
      });
    }

    if (targetType === 'explanation' || targetType === 'quiz_question') {
      const question = await Question.findOne({ where: { id: targetId, user: req.user.id } });
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found.' });
      }
      if (correctedExplanation) {
        question.answer = correctedExplanation;
        await question.save();
      }
      return res.status(200).json({
        success: true,
        message: 'Suggested correction applied successfully to explanation.',
        data: question,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Unsupported target type.',
    });
  } catch (error) {
    next(error);
  }
};
