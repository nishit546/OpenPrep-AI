import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const {
  createPacingPlan,
  calculateRunningPace,
  detectTimeBleed,
  analyzeAttempt,
} = require('../../services/pacingCoachService');

/**
 * The pacing coach shipped with no test of any kind, and its router could not
 * be loaded at all — routes/pacingCoachRoutes.js required
 * '../middleware/authMiddleware', which does not exist. There is only
 * middleware/auth.js, which is what every other route file uses. The whole
 * feature was unreachable, and nothing said so.
 *
 * These cover the four pure functions the controller calls. They need no
 * database: getSubjectPacingProfile is the only part that queries, and it is
 * exercised through the controller's integration path rather than here.
 */

const QUESTIONS = [
  { id: 'q1', maxScore: 1, difficulty: 'easy' },
  { id: 'q2', maxScore: 2, difficulty: 'medium' },
  { id: 'q3', maxScore: 4, difficulty: 'hard' },
  { id: 'q4', maxScore: 1, difficulty: 'medium' },
  { id: 'q5', maxScore: 2, difficulty: 'hard' },
];

const planFor = (overrides = {}) =>
  createPacingPlan({
    totalDurationSeconds: 600,
    questions: QUESTIONS,
    reviewBufferPercent: 10,
    ...overrides,
  });

describe('the route module the fix restores', () => {
  const ROUTE_PATH = path.join(__dirname, '..', '..', 'routes', 'pacingCoachRoutes.js');
  const SOURCE = fs.readFileSync(ROUTE_PATH, 'utf8');

  it('imports the auth guard from the module that exports it', () => {
    // middleware/authMiddleware.js does not exist. Requiring it is
    // "Cannot find module", which took the whole server boot down as soon as
    // server.js reached this router.
    expect(SOURCE).toContain("require('../middleware/auth')");
    expect(SOURCE).not.toContain('authMiddleware');
  });

  it('resolves every middleware it requires', () => {
    const broken = [];

    for (const match of SOURCE.matchAll(/require\('(\.\.\/middleware\/[A-Za-z0-9_.-]+)'\)/g)) {
      const target = path.join(path.dirname(ROUTE_PATH), `${match[1]}.js`);
      if (!fs.existsSync(target)) broken.push(match[1]);
    }

    expect(broken).toEqual([]);
  });

  it('guards every route behind protect', () => {
    // Pacing data is per-student. router.use(protect) covers the file.
    expect(SOURCE).toMatch(/router\.use\(\s*protect\s*\)/);
  });

  it('loads and registers its four routes', () => {
    const router = require('../../routes/pacingCoachRoutes');

    expect(typeof router).toBe('function');
    // router.use(protect) plus the four endpoints.
    expect(router.stack.length).toBe(5);
  });
});

describe('createPacingPlan', () => {
  it('holds back the review buffer before allocating anything', () => {
    const plan = planFor();

    expect(plan.reviewBufferSeconds).toBe(60);
    expect(plan.usableTimeSeconds).toBe(540);
    expect(plan.totalDurationSeconds).toBe(600);
  });

  it('never allocates more than the usable time', () => {
    const plan = planFor();
    const allocated = plan.questionBudgets.reduce((sum, q) => sum + q.budgetSeconds, 0);

    expect(allocated).toBeLessThanOrEqual(plan.usableTimeSeconds);
    expect(plan.allocatedTotalSeconds).toBe(allocated);
  });

  it('weights budget by marks, so a 4-mark question gets more than a 1-mark one', () => {
    const plan = planFor();
    const byId = Object.fromEntries(plan.questionBudgets.map((q) => [q.questionId, q]));

    expect(byId.q3.budgetSeconds).toBeGreaterThan(byId.q2.budgetSeconds);
    expect(byId.q2.budgetSeconds).toBeGreaterThan(byId.q1.budgetSeconds);
  });

  it('weights budget by difficulty at equal marks', () => {
    const plan = createPacingPlan({
      totalDurationSeconds: 600,
      questions: [
        { id: 'easy', maxScore: 2, difficulty: 'easy' },
        { id: 'medium', maxScore: 2, difficulty: 'medium' },
        { id: 'hard', maxScore: 2, difficulty: 'hard' },
      ],
    });

    const [easy, medium, hard] = plan.questionBudgets;

    expect(easy.budgetSeconds).toBeLessThan(medium.budgetSeconds);
    expect(medium.budgetSeconds).toBeLessThan(hard.budgetSeconds);
  });

  it('treats an unknown difficulty as medium rather than dropping the weight', () => {
    const plan = createPacingPlan({
      totalDurationSeconds: 600,
      questions: [
        { id: 'known', maxScore: 2, difficulty: 'medium' },
        { id: 'unknown', maxScore: 2, difficulty: 'fiendish' },
      ],
    });

    const [known, unknown] = plan.questionBudgets;

    expect(unknown.budgetSeconds).toBe(known.budgetSeconds);
  });

  it('runs the cumulative budget monotonically up to the allocated total', () => {
    const plan = planFor();
    const cumulative = plan.questionBudgets.map((q) => q.cumulativeBudgetSeconds);

    expect(cumulative).toEqual([...cumulative].sort((a, b) => a - b));
    expect(cumulative.at(-1)).toBe(plan.allocatedTotalSeconds);
  });

  it('numbers questions from one, in the order they were given', () => {
    const plan = planFor();

    expect(plan.questionBudgets.map((q) => q.order)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.questionBudgets.map((q) => q.questionId)).toEqual([
      'q1',
      'q2',
      'q3',
      'q4',
      'q5',
    ]);
  });

  it('clamps a negative review buffer to zero', () => {
    const plan = planFor({ reviewBufferPercent: -20 });

    expect(plan.reviewBufferSeconds).toBe(0);
    expect(plan.usableTimeSeconds).toBe(600);
  });

  it('clamps a review buffer above 90% so some usable time always remains', () => {
    const plan = planFor({ reviewBufferPercent: 400 });

    expect(plan.usableTimeSeconds).toBe(60);
    expect(plan.allocatedTotalSeconds).toBeGreaterThan(0);
  });

  it('gives every question a floor of five seconds even when time is short', () => {
    const plan = createPacingPlan({
      totalDurationSeconds: 10,
      questions: QUESTIONS,
      reviewBufferPercent: 0,
    });

    expect(Math.min(...plan.questionBudgets.map((q) => q.budgetSeconds))).toBeGreaterThanOrEqual(5);
  });

  it('rejects a non-positive duration instead of dividing by zero', () => {
    expect(createPacingPlan({ totalDurationSeconds: 0, questions: QUESTIONS }).error).toBeTruthy();
    expect(createPacingPlan({ totalDurationSeconds: -60, questions: QUESTIONS }).error).toBeTruthy();
  });

  it('rejects an empty question list', () => {
    const plan = createPacingPlan({ totalDurationSeconds: 600, questions: [] });

    expect(plan.error).toBeTruthy();
    expect(plan.questionBudgets).toEqual([]);
  });

  it('treats a missing or zero mark value as one mark', () => {
    const plan = createPacingPlan({
      totalDurationSeconds: 600,
      questions: [
        { id: 'none', difficulty: 'medium' },
        { id: 'zero', maxScore: 0, difficulty: 'medium' },
        { id: 'one', maxScore: 1, difficulty: 'medium' },
      ],
    });

    const budgets = plan.questionBudgets.map((q) => q.budgetSeconds);

    expect(new Set(budgets).size).toBe(1);
  });

  it('accepts _id and questionId as well as id', () => {
    const plan = createPacingPlan({
      totalDurationSeconds: 300,
      questions: [
        { _id: 'mongo-style', maxScore: 1 },
        { questionId: 'explicit', maxScore: 1 },
      ],
    });

    expect(plan.questionBudgets.map((q) => q.questionId)).toEqual(['mongo-style', 'explicit']);
  });

  it('scales back down when a slow personalisation factor overshoots the usable time', () => {
    const plan = planFor({ personalizationFactor: 1.5 });

    expect(plan.allocatedTotalSeconds).toBeLessThanOrEqual(plan.usableTimeSeconds);
  });

  it('leaves a fast student finishing inside the usable time', () => {
    const plan = planFor({ personalizationFactor: 0.5 });

    expect(plan.allocatedTotalSeconds).toBeLessThan(plan.usableTimeSeconds);
  });
});

describe('calculateRunningPace', () => {
  const plan = planFor();

  it('reports on_track when elapsed time matches the budget consumed', () => {
    const consumed = plan.questionBudgets[0].budgetSeconds;

    const state = calculateRunningPace({
      elapsedSeconds: consumed,
      totalDurationSeconds: 600,
      completedQuestions: [{ questionId: 'q1', timeSpent: consumed }],
      pacingPlan: plan,
    });

    expect(state.paceState).toBe('on_track');
    expect(state.consumedBudget).toBe(consumed);
  });

  it('reports ahead when well under the budget consumed', () => {
    const consumed = plan.questionBudgets[0].budgetSeconds;

    const state = calculateRunningPace({
      elapsedSeconds: Math.floor(consumed * 0.5),
      totalDurationSeconds: 600,
      completedQuestions: [{ questionId: 'q1', timeSpent: 10 }],
      pacingPlan: plan,
    });

    expect(state.paceState).toBe('ahead');
  });

  it('reports behind when over the budget consumed but not out of time', () => {
    const consumed = plan.questionBudgets[0].budgetSeconds;

    const state = calculateRunningPace({
      elapsedSeconds: Math.ceil(consumed * 1.5),
      totalDurationSeconds: 6000,
      completedQuestions: [{ questionId: 'q1', timeSpent: consumed }],
      pacingPlan: plan,
    });

    expect(state.paceState).toBe('behind');
  });

  it('escalates to critical when the time left cannot cover the budget left', () => {
    const state = calculateRunningPace({
      elapsedSeconds: 560,
      totalDurationSeconds: 600,
      completedQuestions: [{ questionId: 'q1', timeSpent: 560 }],
      pacingPlan: plan,
    });

    expect(state.paceState).toBe('critical');
  });

  it('never reports a negative remaining time when the clock has run out', () => {
    const state = calculateRunningPace({
      elapsedSeconds: 900,
      totalDurationSeconds: 600,
      completedQuestions: [],
      pacingPlan: plan,
    });

    expect(state.remainingTime).toBe(0);
  });

  it('ignores a completed question that is not in the plan', () => {
    const state = calculateRunningPace({
      elapsedSeconds: 100,
      totalDurationSeconds: 600,
      completedQuestions: [{ questionId: 'not-in-plan', timeSpent: 100 }],
      pacingPlan: plan,
    });

    expect(state.consumedBudget).toBe(0);
  });

  it('matches question ids across string and number types', () => {
    const numericPlan = createPacingPlan({
      totalDurationSeconds: 600,
      questions: [{ id: 101, maxScore: 1 }],
    });

    const state = calculateRunningPace({
      elapsedSeconds: 60,
      totalDurationSeconds: 600,
      completedQuestions: [{ questionId: '101', timeSpent: 60 }],
      pacingPlan: numericPlan,
    });

    expect(state.consumedBudget).toBeGreaterThan(0);
  });

  it('projects unanswered questions when the current rate will not finish in time', () => {
    const state = calculateRunningPace({
      elapsedSeconds: 500,
      totalDurationSeconds: 600,
      completedQuestions: [{ questionId: 'q1', timeSpent: 500 }],
      pacingPlan: plan,
    });

    expect(state.projectedCompletion.projectedUnanswered).toBeGreaterThan(0);
    expect(state.projectedCompletion.projectedCompletionPercentage).toBeLessThan(100);
  });

  it('projects a full finish when the rate leaves time to spare', () => {
    const state = calculateRunningPace({
      elapsedSeconds: 40,
      totalDurationSeconds: 600,
      completedQuestions: [{ questionId: 'q1', timeSpent: 40 }],
      pacingPlan: plan,
    });

    expect(state.projectedCompletion.projectedUnanswered).toBe(0);
    expect(state.projectedCompletion.projectedCompletionPercentage).toBe(100);
  });

  it('does not project from zero answered questions', () => {
    // Dividing elapsed time by zero answers is Infinity, which would render as
    // a projection of NaN questions on the live strip.
    const state = calculateRunningPace({
      elapsedSeconds: 120,
      totalDurationSeconds: 600,
      completedQuestions: [],
      pacingPlan: plan,
    });

    expect(state.projectedCompletion.estimatedFinishingTime).toBe(0);
    expect(state.projectedCompletion.projectedUnanswered).toBe(0);
    expect(Number.isNaN(state.projectedCompletion.projectedCompletionPercentage)).toBe(false);
  });
});

describe('detectTimeBleed', () => {
  it('does not fire at the threshold itself', () => {
    const result = detectTimeBleed(175, 100);

    expect(result.threshold).toBe(175);
    expect(result.isBleeding).toBe(false);
    expect(result.message).toBeNull();
  });

  it('fires one second past the threshold, with a message', () => {
    const result = detectTimeBleed(176, 100);

    expect(result.isBleeding).toBe(true);
    expect(result.message).toMatch(/moving on/);
  });

  it('honours a custom threshold multiplier', () => {
    expect(detectTimeBleed(120, 100, 1.1).isBleeding).toBe(true);
    expect(detectTimeBleed(120, 100, 3).isBleeding).toBe(false);
  });

  it('stays quiet on a question still inside its budget', () => {
    expect(detectTimeBleed(30, 100).isBleeding).toBe(false);
  });
});

describe('analyzeAttempt', () => {
  const plan = createPacingPlan({
    totalDurationSeconds: 600,
    questions: [
      { id: 'q1', maxScore: 2, difficulty: 'medium' },
      { id: 'q2', maxScore: 2, difficulty: 'medium' },
      { id: 'q3', maxScore: 2, difficulty: 'medium' },
      { id: 'q4', maxScore: 2, difficulty: 'medium' },
    ],
    reviewBufferPercent: 0,
  });

  const budget = plan.questionBudgets[0].budgetSeconds;

  const attempt = {
    timeSpent: 600,
    answers: [
      { questionId: 'q1', timeSpent: Math.floor(budget * 0.5), isCorrect: true }, // efficient
      { questionId: 'q2', timeSpent: Math.ceil(budget * 2), isCorrect: true }, // slow win
      { questionId: 'q3', timeSpent: Math.ceil(budget * 3), isCorrect: false }, // time sink
      { questionId: 'q4', timeSpent: Math.floor(budget * 0.4), isCorrect: false }, // rushed loss
    ],
  };

  it('classifies each of the four outcomes', () => {
    const autopsy = analyzeAttempt(attempt, plan);

    expect(autopsy.classifications).toEqual({
      efficient: 1,
      slow_win: 1,
      time_sink: 1,
      rushed_loss: 1,
    });
  });

  it('labels every analysed question', () => {
    const autopsy = analyzeAttempt(attempt, plan);

    expect(autopsy.analyzedQuestions.map((q) => q.classification)).toEqual([
      'efficient',
      'slow_win',
      'time_sink',
      'rushed_loss',
    ]);
  });

  it('charges opportunity cost only for questions that earned nothing over budget', () => {
    const autopsy = analyzeAttempt(attempt, plan);

    // q3 alone: wrong and over budget, worth 2 marks.
    expect(autopsy.estimatedOpportunityCostMarks).toBe(2);
  });

  it('recommends skipping the time sink and nothing else', () => {
    const autopsy = analyzeAttempt(attempt, plan);

    expect(autopsy.skipRecommendations).toHaveLength(1);
    expect(autopsy.skipRecommendations[0].questionId).toBe('q3');
  });

  it('orders skip recommendations worst first', () => {
    const worse = {
      timeSpent: 600,
      answers: [
        { questionId: 'q1', timeSpent: Math.ceil(budget * 2), isCorrect: false },
        { questionId: 'q2', timeSpent: Math.ceil(budget * 5), isCorrect: false },
      ],
    };

    const autopsy = analyzeAttempt(worse, plan);

    expect(autopsy.skipRecommendations.map((r) => r.questionId)).toEqual(['q2', 'q1']);
  });

  it('totals the time spent across every answer', () => {
    const autopsy = analyzeAttempt(attempt, plan);
    const expected = attempt.answers.reduce((sum, a) => sum + a.timeSpent, 0);

    expect(autopsy.totalTimeSpent).toBe(expected);
    expect(autopsy.totalBudget).toBe(plan.allocatedTotalSeconds);
  });

  it('reports marks earned and marks lost per question', () => {
    const autopsy = analyzeAttempt(attempt, plan);
    const byId = Object.fromEntries(autopsy.analyzedQuestions.map((q) => [q.questionId, q]));

    expect(byId.q1.marksEarned).toBe(2);
    expect(byId.q1.marksLost).toBe(0);
    expect(byId.q3.marksEarned).toBe(0);
    expect(byId.q3.marksLost).toBe(2);
  });

  it('falls back to a 60-second budget for an answer with no plan entry', () => {
    const autopsy = analyzeAttempt(
      { answers: [{ questionId: 'unplanned', timeSpent: 30, isCorrect: true }] },
      plan
    );

    expect(autopsy.analyzedQuestions[0].budget).toBe(60);
    expect(autopsy.analyzedQuestions[0].classification).toBe('efficient');
  });

  it('handles an attempt with no answers without dividing by zero', () => {
    const autopsy = analyzeAttempt({ answers: [] }, plan);

    expect(autopsy.totalTimeSpent).toBe(0);
    expect(autopsy.analyzedQuestions).toEqual([]);
    expect(autopsy.skipRecommendations).toEqual([]);
  });

  it('honours a custom bleed threshold when classifying', () => {
    // At 1.75x, a question at 2x its budget is a slow win. At 4x it is not.
    const barelyOver = {
      answers: [{ questionId: 'q1', timeSpent: Math.ceil(budget * 2), isCorrect: true }],
    };

    expect(analyzeAttempt(barelyOver, plan).classifications.slow_win).toBe(1);
    expect(analyzeAttempt(barelyOver, plan, 4).classifications.slow_win).toBe(0);
  });

  it('reports the time-used ratio as a fixed two-decimal string the UI can parse', () => {
    const autopsy = analyzeAttempt(attempt, plan);

    for (const question of autopsy.analyzedQuestions) {
      expect(question.ratio).toMatch(/^\d+\.\d{2}$/);
      expect(Number.isNaN(Number.parseFloat(question.ratio))).toBe(false);
    }
  });
});
