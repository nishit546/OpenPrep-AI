/**
 * @fileoverview Controller for managing Oral Viva sessions and evaluations.
 */
const { VivaSession, Subject } = require('../models');
const vivaExaminerService = require('../services/vivaExaminerService');
const logger = require('../utils/logger');

/**
 * Starts a new viva session by generating an initial question.
 */
exports.startSession = async (req, res, next) => {
  try {
    const { subjectId, topic } = req.body;
    let topicName = 'General Studies';
    let resolvedSubjectId = null;

    if (subjectId) {
      const subject = await Subject.findByPk(subjectId);
      if (subject) {
        topicName = subject.name;
        resolvedSubjectId = subject.id;
      }
    } else if (topic && typeof topic === 'string' && topic.trim().length >= 3) {
      topicName = topic.trim();
    } else {
      return res.status(400).json({
        success: false,
        message: 'A valid subjectId or topic string (min 3 chars) is required.',
      });
    }

    const initialQuestion = await vivaExaminerService.generateInitialQuestion(topicName);

    // Save session to database (turns starts with the opening question)
    const session = await VivaSession.create({
      userId: req.user.id,
      subjectId: resolvedSubjectId || '00000000-0000-0000-0000-000000000000',
      turns: [
        {
          speaker: 'AI',
          text: initialQuestion,
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        topic: topicName,
        currentQuestion: initialQuestion,
        nextQuestion: initialQuestion, // Support integration tests expecting nextQuestion
        conversationHistory: session.turns,
        turns: session.turns,
      },
    });
  } catch (error) {
    logger.error('Error starting viva session:', error);
    next(error);
  }
};

/**
 * Evaluates a user's answer and returns feedback + next question.
 */
exports.respondSession = async (req, res, next) => {
  try {
    const { sessionId, studentAnswer, userAnswer, currentQuestion } = req.body;
    const answer = studentAnswer || userAnswer;

    if (!sessionId || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId and studentAnswer/userAnswer.',
      });
    }

    if (answer.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Answer is too short to evaluate.',
      });
    }

    const session = await VivaSession.findOne({
      where: { id: sessionId, userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Viva session not found.',
      });
    }

    // Determine what subjectName/topic name to pass to evaluator
    let topicName = 'General Studies';
    if (session.subjectId && session.subjectId !== '00000000-0000-0000-0000-000000000000') {
      const subject = await Subject.findByPk(session.subjectId);
      if (subject) topicName = subject.name;
    }

    // Use last turn as the question context if available
    const lastTurn = session.turns && session.turns[session.turns.length - 1];
    const questionText = lastTurn ? lastTurn.text : (currentQuestion || 'Please answer the question.');

    const evaluation = await vivaExaminerService.evaluateVivaResponse(
      questionText,
      answer.trim(),
      topicName
    );

    // Update conversation history
    const updatedHistory = [
      ...session.turns,
      {
        speaker: 'student',
        text: answer.trim(),
        score: evaluation.score,
        feedback: evaluation.feedback,
      },
      {
        speaker: 'AI',
        text: evaluation.nextQuestion,
      },
    ];

    session.turns = updatedHistory;
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        evaluation,
        conversationHistory: updatedHistory,
        turns: updatedHistory,
        nextQuestion: evaluation.nextQuestion,
      },
    });
  } catch (error) {
    logger.error('Error evaluating viva answer:', error);
    next(error);
  }
};

/**
 * Evaluates the entire viva session and generates a final scorecard.
 */
exports.evaluateSession = async (req, res, next) => {
  try {
    const { sessionId, userAnswer, studentAnswer } = req.body;
    const answer = userAnswer || studentAnswer;

    if (answer) {
      // Delegate to respondSession if user answer is sent to evaluate endpoint
      return exports.respondSession(req, res, next);
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Provide sessionId.',
      });
    }

    const session = await VivaSession.findOne({
      where: { id: sessionId, userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Viva session not found.',
      });
    }

    // Resolve subject / topic name
    let topicName = 'General Studies';
    if (session.subjectId && session.subjectId !== '00000000-0000-0000-0000-000000000000') {
      const subject = await Subject.findByPk(session.subjectId);
      if (subject) topicName = subject.name;
    }

    const scorecard = await vivaExaminerService.generateFinalScorecard(topicName, session.turns);

    session.score = scorecard.score;
    session.feedback = scorecard;
    await session.save();

    res.status(200).json({
      success: true,
      data: scorecard,
    });
  } catch (error) {
    logger.error('Error evaluating viva session:', error);
    next(error);
  }
};
