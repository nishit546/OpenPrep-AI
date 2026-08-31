/**
 * Unit tests for analyticsAggregationService.
 *
 * Tests cover: the pure state-fold used for both incremental and rebuild
 * paths, duplicate-event idempotency, concurrent quiz/flashcard activity
 * not corrupting the Progress aggregate, and rebuild-vs-incremental parity.
 */

const { v4: uuidv4 } = require('uuid');
const {
  applyEventToProgressState,
  recordQuizAttemptEvent,
  recordFlashcardReviewEvent,
  rebuildProgressForUser,
} = require('../../services/analyticsAggregationService');

/**
 * Minimal in-memory double for the pieces of Sequelize the service uses.
 *
 * The interesting part is `sequelize.query`: the service asks for a
 * Postgres advisory lock there before touching Progress, so this fake
 * implements that as a real per-key mutex, held for the life of the
 * "transaction". Two concurrent calls into the service for the same
 * (user, subject, topic) key genuinely queue behind each other here, the
 * same way an advisory lock would serialize them in Postgres — which is
 * what makes the concurrency tests below meaningful instead of trivially
 * passing.
 */
function createFakeModels() {
  const learningEvents = [];
  const progressRows = [];
  const lockQueue = new Map(); // key -> promise chain

  function acquireLock(key) {
    const prior = lockQueue.get(key) || Promise.resolve();
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    lockQueue.set(key, prior.then(() => held));
    return prior.then(() => release);
  }

  const sequelize = {
    async transaction(fn) {
      const releases = [];
      const transaction = {
        async _lock(key) {
          const release = await acquireLock(key);
          releases.push(release);
        },
      };
      try {
        return await fn(transaction);
      } finally {
        releases.forEach((release) => release());
      }
    },
    async query(_sql, { replacements, transaction }) {
      // Stand-in for `SELECT pg_advisory_xact_lock(...)`.
      await transaction._lock(replacements.key);
    },
  };

  const LearningEvent = {
    async create(data, { transaction }) {
      const isDuplicate = learningEvents.some(
        (e) => e.eventType === data.eventType && e.sourceId === data.sourceId
      );
      if (isDuplicate) {
        const err = new Error('duplicate learning event');
        err.name = 'SequelizeUniqueConstraintError';
        throw err;
      }
      const event = { id: uuidv4(), createdAt: new Date(), ...data };
      learningEvents.push(event);
      return event;
    },
    async findAll({ where }) {
      return learningEvents
        .filter((e) => e.user === where.user)
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt);
    },
  };

  const Progress = {
    async findOne({ where }) {
      return (
        progressRows.find(
          (p) => p.user === where.user && p.subject === where.subject && p.topic === (where.topic ?? null)
        ) || null
      );
    },
    async findOrCreate({ where, defaults }) {
      const existing = await this.findOne({ where });
      if (existing) return [existing, false];
      const row = {
        quizScores: [],
        completionPercentage: 0,
        flashcardsMastered: 0,
        ...defaults,
        topic: defaults.topic ?? null,
        async save() {},
      };
      progressRows.push(row);
      return [row, true];
    },
    async create(data) {
      const row = {
        quizScores: [],
        completionPercentage: 0,
        flashcardsMastered: 0,
        ...data,
        topic: data.topic ?? null,
        async save() {},
      };
      progressRows.push(row);
      return row;
    },
  };

  return { sequelize, LearningEvent, Progress, progressRows, learningEvents };
}

describe('analyticsAggregationService', () => {
  describe('applyEventToProgressState', () => {
    it('adds a quiz score and raises completionPercentage on a higher score', () => {
      const state = { quizScores: [], completionPercentage: 40, flashcardsMastered: 0 };
      const next = applyEventToProgressState(state, {
        eventType: 'quiz_attempt',
        payload: { attemptId: 'a1', score: 70 },
        createdAt: new Date(),
      });
      expect(next.quizScores).toHaveLength(1);
      expect(next.completionPercentage).toBe(70);
    });

    it('does not lower completionPercentage on a worse score', () => {
      const state = { quizScores: [], completionPercentage: 80, flashcardsMastered: 0 };
      const next = applyEventToProgressState(state, {
        eventType: 'quiz_attempt',
        payload: { attemptId: 'a2', score: 30 },
        createdAt: new Date(),
      });
      expect(next.completionPercentage).toBe(80);
    });

    it('increments flashcardsMastered only when the review was mastered', () => {
      const state = { quizScores: [], completionPercentage: 0, flashcardsMastered: 2 };
      const mastered = applyEventToProgressState(state, {
        eventType: 'flashcard_review',
        payload: { mastered: true },
      });
      const notMastered = applyEventToProgressState(state, {
        eventType: 'flashcard_review',
        payload: { mastered: false },
      });
      expect(mastered.flashcardsMastered).toBe(3);
      expect(notMastered.flashcardsMastered).toBe(2);
    });
  });

  describe('duplicate events', () => {
    it('recording the same quiz attempt id twice only applies it once', async () => {
      const models = createFakeModels();
      const args = { userId: 'u1', subject: 's1', topic: null, attemptId: 'attempt-1', score: 60 };

      const first = await recordQuizAttemptEvent(args, { models });
      const second = await recordQuizAttemptEvent(args, { models });

      expect(first.applied).toBe(true);
      expect(second.applied).toBe(false);
      expect(second.duplicate).toBe(true);

      const progress = await models.Progress.findOne({ where: { user: 'u1', subject: 's1', topic: null } });
      expect(progress.quizScores).toHaveLength(1);
    });

    it('recording the same flashcard review id twice only counts it once', async () => {
      const models = createFakeModels();
      const args = { userId: 'u1', subject: 's1', topic: null, reviewId: 'review-1', mastered: true };

      await recordFlashcardReviewEvent(args, { models });
      await recordFlashcardReviewEvent(args, { models });

      const progress = await models.Progress.findOne({ where: { user: 'u1', subject: 's1', topic: null } });
      expect(progress.flashcardsMastered).toBe(1);
    });
  });

  describe('concurrent activity', () => {
    it('two concurrent quiz submissions for the same subject both land, none lost', async () => {
      const models = createFakeModels();

      await Promise.all([
        recordQuizAttemptEvent(
          { userId: 'u1', subject: 's1', topic: null, attemptId: 'attempt-A', score: 50 },
          { models }
        ),
        recordQuizAttemptEvent(
          { userId: 'u1', subject: 's1', topic: null, attemptId: 'attempt-B', score: 90 },
          { models }
        ),
      ]);

      const progress = await models.Progress.findOne({ where: { user: 'u1', subject: 's1', topic: null } });
      expect(progress.quizScores).toHaveLength(2);
      expect(progress.completionPercentage).toBe(90);
    });

    it('two concurrent flashcard reviews on a brand-new Progress row both count', async () => {
      const models = createFakeModels();

      await Promise.all([
        recordFlashcardReviewEvent(
          { userId: 'u2', subject: 's2', topic: null, reviewId: 'review-A', mastered: true },
          { models }
        ),
        recordFlashcardReviewEvent(
          { userId: 'u2', subject: 's2', topic: null, reviewId: 'review-B', mastered: true },
          { models }
        ),
      ]);

      const rows = models.progressRows.filter((p) => p.user === 'u2' && p.subject === 's2');
      expect(rows).toHaveLength(1); // no duplicate row created by the race
      expect(rows[0].flashcardsMastered).toBe(2);
    });
  });

  describe('rebuildProgressForUser', () => {
    it('produces the same values as the incremental path', async () => {
      const models = createFakeModels();

      await recordQuizAttemptEvent({ userId: 'u3', subject: 's3', topic: null, attemptId: 'a1', score: 40 }, { models });
      await recordQuizAttemptEvent({ userId: 'u3', subject: 's3', topic: null, attemptId: 'a2', score: 85 }, { models });
      await recordFlashcardReviewEvent(
        { userId: 'u3', subject: 's3', topic: null, reviewId: 'r1', mastered: true },
        { models }
      );
      await recordFlashcardReviewEvent(
        { userId: 'u3', subject: 's3', topic: null, reviewId: 'r2', mastered: false },
        { models }
      );

      const incremental = await models.Progress.findOne({ where: { user: 'u3', subject: 's3', topic: null } });
      const incrementalSnapshot = {
        quizScores: incremental.quizScores.map((s) => ({ attempt: s.attempt, score: s.score })),
        completionPercentage: incremental.completionPercentage,
        flashcardsMastered: incremental.flashcardsMastered,
      };

      // Corrupt the live row to prove rebuild recomputes from events, not
      // from whatever Progress currently holds.
      incremental.completionPercentage = 0;
      incremental.flashcardsMastered = 0;
      incremental.quizScores = [];

      await rebuildProgressForUser('u3', { models });

      const rebuilt = await models.Progress.findOne({ where: { user: 'u3', subject: 's3', topic: null } });
      expect(rebuilt.completionPercentage).toBe(incrementalSnapshot.completionPercentage);
      expect(rebuilt.flashcardsMastered).toBe(incrementalSnapshot.flashcardsMastered);
      expect(rebuilt.quizScores.map((s) => ({ attempt: s.attempt, score: s.score }))).toEqual(
        incrementalSnapshot.quizScores
      );
    });
  });
});