const { v4: uuidv4 } = require('uuid');
const BattleSession = require('../models/BattleSession');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Quiz = require('../models/Quiz');
const BattleParticipant = require('../models/BattleParticipant');
const roomManager = require('../utils/roomManager');
const { publicQuiz } = require('../services/battleLobbyProjection');
const geminiService = require('../services/geminiService');
const { generateRoomCode } = require('../sockets/battleRoomAccess');

exports.createBattleSession = async (req, res, next) => {
  try {
    const {
      subjectId,
      topicId,
      questionCount = 5,
      timePerQuestion = 15,
      roomName = 'Battle Room',
      password = '',
    } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'subjectId is required.' });
    }

    const subject = await Subject.findOne({ where: { id: subjectId, user: req.user.id } });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found.' });
    }

    let topicName = '';
    if (topicId) {
      const topic = await Topic.findOne({ where: { id: topicId, subject: subjectId, user: req.user.id } });
      if (!topic) {
        return res.status(404).json({ success: false, error: 'Topic not found.' });
      }
      topicName = topic.name;
    }

    // Generate unique room code
    let roomCode = '';
    let isUnique = false;
    while (!isUnique) {
      roomCode = generateRoomCode();
      const existing = await BattleSession.findOne({ where: { roomCode } });
      if (!existing) isUnique = true;
    }

    // Find or generate a Quiz
    let quiz = await Quiz.findOne({
      where: {
        subject: subjectId,
        createdBy: req.user.id,
        ...(topicId ? { topic: topicId } : {}),
      },
      order: [['createdAt', 'DESC']],
    });

    if (!quiz) {
      try {
        // Try generating a quiz via Gemini
        const aiQuiz = await geminiService.generateQuiz(
          subject.name,
          topicName || 'General Concepts',
          '',
          questionCount,
          false,
          'english',
          'Medium'
        );

        const questionsWithIds = aiQuiz.questions.map((q) => ({
          _id: uuidv4(),
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
        }));

        quiz = await Quiz.create({
          title: aiQuiz.title || `${topicName || subject.name} Live Battle Quiz`,
          subject: subjectId,
          topic: topicId || null,
          questions: questionsWithIds,
          type: 'AI_Generated',
          createdBy: req.user.id,
        });
      } catch (err) {
        console.warn('Gemini quiz generation failed for battle lobby, using fallback questions:', err.message);
        // Fallback quiz creation
        const fallbackQuestions = Array.from({ length: questionCount }).map((_, idx) => ({
          _id: uuidv4(),
          questionText: `Practice Question #${idx + 1} for ${topicName || subject.name}. What is the correct option?`,
          options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'This is a practice fallback answer explanation.',
        }));

        quiz = await Quiz.create({
          title: `${topicName || subject.name} Battle Quiz`,
          subject: subjectId,
          topic: topicId || null,
          questions: fallbackQuestions,
          type: 'AI_Generated',
          createdBy: req.user.id,
        });
      }
    }

    const battle = await BattleSession.create({
      roomCode,
      hostUserId: req.user.id,
      subjectId,
      topicId: topicId || null,
      questionCount,
      timePerQuestion,
      status: 'waiting',
      scores: {},
      quizId: quiz.id,
      roomName,
      password,
    });

    res.status(201).json({
      success: true,
      data: {
        id: battle.id,
        roomCode: battle.roomCode,
        hostUserId: battle.hostUserId,
        questionCount: battle.questionCount,
        timePerQuestion: battle.timePerQuestion,
        quiz: publicQuiz(quiz),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBattleSession = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const battle = await BattleSession.findOne({
      where: { roomCode: roomCode.trim().toUpperCase() },
    });

    if (!battle) {
      return res.status(404).json({ success: false, error: 'Battle lobby not found.' });
    }

    const userId = String(req.user.id);
    const room = roomManager.getRoom(battle.roomCode);
    const isHost = String(battle.hostUserId) === userId;
    const isLiveParticipant = room && Object.values(room.players).some(
      (player) => String(player.userId) === userId
    );
    const isPastParticipant = !isHost && !isLiveParticipant && battle.status === 'finished' &&
      await BattleParticipant.findOne({ where: { battleId: battle.id, userId: req.user.id } });
    if (!isHost && !isLiveParticipant && !isPastParticipant) {
      // Match the missing-room response so private lobby membership is not disclosed.
      return res.status(404).json({ success: false, error: 'Battle lobby not found.' });
    }

    const quiz = battle.quizId ? await Quiz.findByPk(battle.quizId) : null;

    res.status(200).json({
      success: true,
      data: {
        id: battle.id,
        roomCode: battle.roomCode,
        hostUserId: battle.hostUserId,
        subjectId: battle.subjectId,
        topicId: battle.topicId,
        questionCount: battle.questionCount,
        timePerQuestion: battle.timePerQuestion,
        status: battle.status,
        scores: battle.scores,
        quiz: publicQuiz(quiz),
      },
    });
  } catch (error) {
    next(error);
  }
};
