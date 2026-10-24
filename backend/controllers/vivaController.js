/**
 * @fileoverview Controller for managing Oral Viva sessions and evaluations.
 */
const { VivaSession, Subject } = require('../models');
const socratic = require('../services/socraticVivaService');
const logger = require('../utils/logger');

const MAX_ANSWER_CHARS = 4000;

/** Session topic, falling back to the subject name for sessions created before topic was stored. */
async function resolveTopic(session) {
  if (session.topic) return session.topic;
  if (session.subjectId && session.subjectId !== '00000000-0000-0000-0000-000000000000') {
    const subject = await Subject.findByPk(session.subjectId);
    if (subject) return subject.name;
  }
  return 'General Studies';
}

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
      // An optional syllabus topic narrows the subject.
      if (topic && typeof topic === 'string' && topic.trim().length >= 3) {
        topicName = `${topicName}: ${socratic.sanitizeTopic(topic)}`.slice(0, 120);
      }
    } else if (topic && typeof topic === 'string' && topic.trim().length >= 3) {
      topicName = socratic.sanitizeTopic(topic);
    } else {
      return res.status(400).json({
        success: false,
        message: 'A valid subjectId or topic string (min 3 chars) is required.',
      });
    }

    const startDepth = socratic.DEFAULT_DEPTH;
    const initialQuestion = await socratic.generateOpeningQuestion(topicName, startDepth);

    // Save session to database (turns starts with the opening question)
    const session = await VivaSession.create({
      userId: req.user.id,
      subjectId: resolvedSubjectId || '00000000-0000-0000-0000-000000000000',
      topic: topicName,
      depth: startDepth,
      transcript: [{ speaker: 'AI', text: initialQuestion, at: new Date().toISOString() }],
      rubric: [],
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
        depth: startDepth,
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
    const { sessionId, studentAnswer, userAnswer, currentQuestion, rawTranscript } = req.body;
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

    const topicName = await resolveTopic(session);

    // Use last turn as the question context if available
    const lastTurn = session.turns && session.turns[session.turns.length - 1];
    const questionText = lastTurn ? lastTurn.text : (currentQuestion || 'Please answer the question.');
    const finalAnswer = answer.trim().slice(0, MAX_ANSWER_CHARS);

    const evaluation = await socratic.evaluateAnswer({
      topic: topicName,
      depth: session.depth,
      question: questionText,
      answer: finalAnswer,
    });

    const at = new Date().toISOString();
    const rawText = typeof rawTranscript === 'string' ? rawTranscript.trim().slice(0, MAX_ANSWER_CHARS) : '';

    // Update conversation history
    const updatedHistory = [
      ...session.turns,
      {
        speaker: 'student',
        text: finalAnswer,
        score: evaluation.score,
        feedback: evaluation.feedback,
        rubric: evaluation.rubric,
        hesitation: evaluation.hesitation,
      },
      {
        speaker: 'AI',
        text: evaluation.nextQuestion,
        depth: evaluation.nextDepth,
        mode: evaluation.mode,
      },
    ];

    session.turns = updatedHistory;
    session.depth = evaluation.nextDepth;
    session.rubric = [...(session.rubric || []), { ...evaluation.rubric, depth: evaluation.depth }];
    session.transcript = [
      ...(session.transcript || []),
      { speaker: 'student', text: finalAnswer, edited: !!rawText && rawText !== finalAnswer, at },
      { speaker: 'AI', text: evaluation.nextQuestion, at },
    ];
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        evaluation,
        depth: evaluation.nextDepth,
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

    const topicName = await resolveTopic(session);

    const scorecard = await socratic.generateReport({
      topic: topicName,
      turns: session.turns || [],
      rubric: session.rubric || [],
    });
    scorecard.finalDepth = session.depth;

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
