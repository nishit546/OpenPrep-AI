const { Op } = require('sequelize');
const { Flashcard, Question, Subject, Topic, Progress, User } = require('../models');
const { calculateSM2 } = require('../utils/sm2');
const gamificationService = require('../services/gamificationService');

/**
 * @desc    Fetch the single highest-priority micro-learning item (due flashcard or quick question)
 * @route   GET /api/micro/next-due-card
 * @access  Private
 */
exports.getNextDueCard = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const userId = req.user.id;
    const now = new Date();

    // 1. Look for highest-priority flashcard due for spaced repetition review
    const dueFlashcard = await Flashcard.findOne({
      where: {
        user: userId,
        nextReviewDate: { [Op.lte]: now },
      },
      order: [
        ['nextReviewDate', 'ASC'],
        ['interval', 'ASC'],
      ],
      include: [
        { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
        { model: Topic, as: 'topicRef', attributes: ['id', 'name'] },
      ],
    });

    if (dueFlashcard) {
      return res.status(200).json({
        success: true,
        type: 'flashcard',
        item: {
          id: dueFlashcard.id,
          front: dueFlashcard.front,
          back: dueFlashcard.back,
          subject: dueFlashcard.subjectRef?.name || 'General',
          topic: dueFlashcard.topicRef?.name || null,
          interval: dueFlashcard.interval,
          repetitions: dueFlashcard.repetitions,
          efactor: dueFlashcard.efactor,
          difficulty: dueFlashcard.difficulty || 'Medium',
        },
        durationMs: Date.now() - startTime,
      });
    }

    // 2. If no flashcards are currently overdue, pick any question or recent flashcard
    const anyQuestion = await Question.findOne({
      where: { user: userId },
      order: [['createdAt', 'DESC']],
    });

    if (anyQuestion) {
      // Parse question options if string or return array
      let parsedOptions = [];
      try {
        parsedOptions = typeof anyQuestion.options === 'string'
          ? JSON.parse(anyQuestion.options)
          : (anyQuestion.options || []);
      } catch {
        parsedOptions = [];
      }

      return res.status(200).json({
        success: true,
        type: 'question',
        item: {
          id: anyQuestion.id,
          question: anyQuestion.question,
          answer: anyQuestion.answer,
          options: parsedOptions,
          questionType: anyQuestion.type || 'multiple_choice',
          difficulty: anyQuestion.difficulty || 'medium',
          sourceTitle: anyQuestion.sourceTitle || 'Study Notes',
        },
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Fallback to newest flashcard if available
    const anyFlashcard = await Flashcard.findOne({
      where: { user: userId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
        { model: Topic, as: 'topicRef', attributes: ['id', 'name'] },
      ],
    });

    if (anyFlashcard) {
      return res.status(200).json({
        success: true,
        type: 'flashcard',
        item: {
          id: anyFlashcard.id,
          front: anyFlashcard.front,
          back: anyFlashcard.back,
          subject: anyFlashcard.subjectRef?.name || 'General',
          topic: anyFlashcard.topicRef?.name || null,
          interval: anyFlashcard.interval,
          repetitions: anyFlashcard.repetitions,
          efactor: anyFlashcard.efactor,
          difficulty: anyFlashcard.difficulty || 'Medium',
        },
        durationMs: Date.now() - startTime,
      });
    }

    // Default sample if user has no study materials yet
    return res.status(200).json({
      success: true,
      type: 'sample',
      item: {
        id: 'sample-01',
        front: 'What is the primary benefit of spaced retrieval practice?',
        back: 'It interrupts the forgetting curve, strengthening long-term memory synaptic consolidation and neural recall efficiency.',
        options: [
          'It increases cramming velocity before exams',
          'It interrupts the forgetting curve and strengthens neural consolidation',
          'It reduces total flashcards created',
          'It disables notifications during study sessions',
        ],
        answer: 'It interrupts the forgetting curve and strengthens neural consolidation',
        subject: 'Learning Science',
        topic: 'Cognitive Principles',
        difficulty: 'Easy',
      },
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit answer to a micro-learning question or flashcard rating
 * @route   POST /api/micro/submit-answer
 * @access  Private
 */
exports.submitAnswer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId, itemType, quality, selectedAnswer, isCorrect } = req.body;

    let scoreAwarded = 0;
    let xpEarned = 15;
    let coinsEarned = 5;
    let updatedNextReviewDate = null;

    // Process flashcard review
    if (itemType === 'flashcard' && itemId !== 'sample-01') {
      const card = await Flashcard.findOne({ where: { id: itemId, user: userId } });
      if (card) {
        const ratingQuality = typeof quality === 'number' ? quality : (isCorrect ? 4 : 1);
        
        const easyFactorModifier = req.user.sm2EasyFactorModifier ?? 1.0;
        const intervalModifier = req.user.sm2IntervalModifier ?? 1.0;
        const step1Interval = req.user.sm2Step1Interval ?? 1;
        const step2Interval = req.user.sm2Step2Interval ?? 6;

        const { interval: nextInterval, repetitions: nextRepetitions, efactor: nextEfactor } = calculateSM2({
          interval: card.interval || 1,
          repetitions: card.repetitions || 0,
          efactor: card.efactor || 2.5,
          quality: ratingQuality,
          easyFactorModifier,
          intervalModifier,
          step1Interval,
          step2Interval,
        });

        card.interval = nextInterval;
        card.repetitions = nextRepetitions;
        card.efactor = nextEfactor;
        card.nextReviewDate = new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000);
        await card.save();
        updatedNextReviewDate = card.nextReviewDate;

        // If card mastered, record in progress
        if (ratingQuality >= 4) {
          const progressTopic = card.topic || null;
          const [progress] = await Progress.findOrCreate({
            where: {
              user: userId,
              subject: card.subject,
              topic: progressTopic,
            },
            defaults: {
              user: userId,
              subject: card.subject,
              topic: progressTopic,
              flashcardsMastered: 0,
              completionPercentage: 0,
              studyHours: 0,
            },
          });
          progress.flashcardsMastered += 1;
          await progress.save();
        }
      }
    }

    // Award XP and Coins
    const xpResult = await gamificationService.awardXP(userId, xpEarned, 'micro_learning_quick_review');
    await gamificationService.awardCoins(userId, coinsEarned, 'Micro-learning session reward')
      .catch((err) => console.warn('Error awarding micro coins:', err.message));

    // Update study streak
    const timeZoneParam = req.headers['x-timezone'] || (req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null);
    await gamificationService.updateStreak(userId, timeZoneParam);

    const user = await User.findByPk(userId, { attributes: ['id', 'xp', 'streak', 'prepCoins'] });

    res.status(200).json({
      success: true,
      message: 'Micro-learning attempt recorded successfully',
      xpEarned,
      coinsEarned,
      currentXp: user?.xp,
      streak: user?.streak,
      prepCoins: user?.prepCoins,
      nextReviewDate: updatedNextReviewDate,
    });
  } catch (error) {
    next(error);
  }
};
