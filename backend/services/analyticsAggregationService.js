const { v4: uuidv4 } = require('uuid');
const defaultModels = require('../models');

/**
 * Pure fold: applies one learning event onto a Progress aggregate state and
 * returns the new state.
 *
 * This same function drives both:
 *   - the incremental path (a single new event applied to the current
 *     Progress row), and
 *   - the reconciliation path (every event for a user replayed from an
 *     empty state),
 *
 * so the two can never disagree with each other — they are literally the
 * same code.
 *
 * @param {{quizScores: Array, completionPercentage: number, flashcardsMastered: number}} state
 * @param {{eventType: string, payload: object, createdAt?: Date}} event
 */
function applyEventToProgressState(state, event) {
  const next = {
    quizScores: [...(state.quizScores || [])],
    completionPercentage: state.completionPercentage || 0,
    flashcardsMastered: state.flashcardsMastered || 0,
  };

  if (event.eventType === 'quiz_attempt') {
    const { attemptId, score, date } = event.payload;
    next.quizScores.push({ attempt: attemptId, score, date: date || event.createdAt });
    if (score > next.completionPercentage) {
      next.completionPercentage = Math.min(score, 100);
    }
  } else if (event.eventType === 'flashcard_review') {
    if (event.payload.mastered) {
      next.flashcardsMastered += 1;
    }
  }

  return next;
}

function progressGroupKey(userId, subject, topic) {
  return `${userId}:${subject}:${topic || 'null'}`;
}

/**
 * Serializes every caller working on the same (user, subject, topic)
 * aggregate — including the very first write that creates the Progress
 * row. A plain `SELECT ... FOR UPDATE` can't help with that first-write
 * race because there is no row yet to lock, so this takes a Postgres
 * advisory lock on the key itself instead. It is held for the lifetime of
 * the transaction and released automatically on commit/rollback.
 */
async function lockProgressKey(sequelize, transaction, key) {
  await sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))', {
    replacements: { key },
    transaction,
  });
}

/**
 * Idempotently records a learning event and applies it to the matching
 * Progress row inside one transaction. If an event with the same
 * (eventType, sourceId) was already recorded, the insert fails on the
 * unique index and this returns without touching Progress again — that is
 * what makes retries/replays safe.
 *
 * @param {{userId: string, subject: string, topic?: string|null, eventType: string, sourceId: string, payload: object}} params
 * @param {{models?: object}} [options] Inject a models object for testing.
 */
async function recordLearningEvent(
  { userId, subject, topic = null, eventType, sourceId, payload },
  options = {}
) {
  const models = options.models || defaultModels;
  const { sequelize, LearningEvent, Progress } = models;

  return sequelize.transaction(async (transaction) => {
    await lockProgressKey(sequelize, transaction, progressGroupKey(userId, subject, topic));

    let event;
    try {
      event = await LearningEvent.create(
        { user: userId, subject, topic, eventType, sourceId, payload },
        { transaction }
      );
    } catch (err) {
      const isDuplicate =
        err.name === 'SequelizeUniqueConstraintError' ||
        (err.parent && err.parent.code === '23505');
      if (isDuplicate) {
        return { applied: false, duplicate: true };
      }
      throw err;
    }

    let progress = await Progress.findOne({
      where: { user: userId, subject, topic },
      transaction,
    });

    const currentState = progress
      ? {
          quizScores: progress.quizScores,
          completionPercentage: progress.completionPercentage,
          flashcardsMastered: progress.flashcardsMastered,
        }
      : { quizScores: [], completionPercentage: 0, flashcardsMastered: 0 };

    const nextState = applyEventToProgressState(currentState, event);

    if (progress) {
      progress.quizScores = nextState.quizScores;
      progress.completionPercentage = nextState.completionPercentage;
      progress.flashcardsMastered = nextState.flashcardsMastered;
      await progress.save({ transaction });
    } else {
      progress = await Progress.create(
        {
          user: userId,
          subject,
          topic,
          quizScores: nextState.quizScores,
          completionPercentage: nextState.completionPercentage,
          flashcardsMastered: nextState.flashcardsMastered,
        },
        { transaction }
      );
    }

    return { applied: true, duplicate: false, event, progress };
  });
}

/**
 * Records a scored quiz attempt as a learning event. `attemptId` (the
 * QuizAttempt id) is the event's unique source id, so re-processing the
 * same attempt is a no-op.
 */
async function recordQuizAttemptEvent({ userId, subject, topic = null, attemptId, score }, options = {}) {
  return recordLearningEvent(
    {
      userId,
      subject,
      topic,
      eventType: 'quiz_attempt',
      sourceId: attemptId,
      payload: { attemptId, score, date: new Date() },
    },
    options
  );
}

/**
 * Records a flashcard review as a learning event. Callers that already
 * have a stable id for the review (e.g. from a client-supplied
 * idempotency key) should pass it as `reviewId`; otherwise one is
 * generated, and this call is treated as a distinct event.
 */
async function recordFlashcardReviewEvent({ userId, subject, topic = null, reviewId, mastered }, options = {}) {
  return recordLearningEvent(
    {
      userId,
      subject,
      topic,
      eventType: 'flashcard_review',
      sourceId: reviewId || uuidv4(),
      payload: { mastered: !!mastered },
    },
    options
  );
}

/**
 * Rebuilds every Progress row for a user by replaying their full
 * LearningEvent history through applyEventToProgressState from scratch.
 * Because that is the same fold the incremental path uses, a rebuild
 * always lands on the same numbers a fully-consistent incremental run
 * would have produced.
 *
 * @param {string} userId
 * @param {{models?: object}} [options]
 * @returns {Promise<Array>} The rebuilt Progress rows.
 */
async function rebuildProgressForUser(userId, options = {}) {
  const models = options.models || defaultModels;
  const { sequelize, LearningEvent, Progress } = models;

  return sequelize.transaction(async (transaction) => {
    // Prevents this rebuild from racing an incremental write for the same
    // user while it is reading/replaying events.
    await lockProgressKey(sequelize, transaction, `rebuild:${userId}`);

    const events = await LearningEvent.findAll({
      where: { user: userId },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      transaction,
    });

    const groups = new Map(); // progressGroupKey -> { subject, topic, state }

    for (const event of events) {
      const key = progressGroupKey(userId, event.subject, event.topic);
      const group = groups.get(key) || {
        subject: event.subject,
        topic: event.topic,
        state: { quizScores: [], completionPercentage: 0, flashcardsMastered: 0 },
      };
      group.state = applyEventToProgressState(group.state, event);
      groups.set(key, group);
    }

    const rebuilt = [];
    for (const { subject, topic, state } of groups.values()) {
      const [progress] = await Progress.findOrCreate({
        where: { user: userId, subject, topic },
        defaults: { user: userId, subject, topic },
        transaction,
      });
      progress.quizScores = state.quizScores;
      progress.completionPercentage = state.completionPercentage;
      progress.flashcardsMastered = state.flashcardsMastered;
      await progress.save({ transaction });
      rebuilt.push(progress);
    }

    return rebuilt;
  });
}

module.exports = {
  applyEventToProgressState,
  recordLearningEvent,
  recordQuizAttemptEvent,
  recordFlashcardReviewEvent,
  rebuildProgressForUser,
};